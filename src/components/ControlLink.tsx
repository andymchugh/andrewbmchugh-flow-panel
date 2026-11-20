import { TemplateSrv } from '@grafana/runtime';
import { Link } from 'components/Config';
import { SvgElementAttribs } from 'components/SvgUpdater';
import { TimeSeriesData } from 'components/TimeSeries';
import { constructUrl, flowDebug, substituteReservedTokens, substituteTokens } from 'components/Utils';

//-----------------------------------------------------------------------------
// Types

// Leaf values that can be driven into cells. Booleans are stored as 1/0 so they
// can be used with thresholds and value mappings.
export type ControlResultValue = number | string | null;

export type ControlError = {
  status: number | undefined;
  message: string;
};

// One result value. 'time' is the epoch ms the response arrived. It is undefined for
// 'end' results, which are pinned to the end of the panel time range.
export type ControlResultPoint = {
  time: number | undefined;
  value: ControlResultValue;
};

// Most recent points kept per dataRef. Oldest are dropped first.
export const gControlMaxPointsPerRef = 500;

// Panel-level state for control links. 'results' is keyed by dataRef name and is
// merged into the time-series data on each render. 'errors' is keyed by cell name.
export type ControlState = {
  results: Map<string, ControlResultPoint[]>;
  errors: Map<string, ControlError>;
};

export type ControlOutcome =
  | { ok: true; values: Map<string, ControlResultValue> | undefined; time: number | undefined }
  | { ok: false; error: ControlError };

export type ControlRequest = {
  url: string;
  init: RequestInit;
};

export type HttpOutcome =
  | { ok: true; status: number; text: string }
  | { ok: false; status: number | undefined; message: string };

export type ParseOutcome =
  | { ok: true; values: Map<string, ControlResultValue> }
  | { ok: false; message: string };

//-----------------------------------------------------------------------------
// Request construction

// Same substitution order as constructUrl: panel/site linkVariables, then reserved
// cell tokens, then grafana variables.
function substituteString(str: string, attribs: SvgElementAttribs, linkVariables: Map<string, string>, templateSrv: TemplateSrv) {
  return templateSrv.replace(substituteReservedTokens(substituteTokens(str, linkVariables), attribs));
}

// The body is substituted value-by-value and only then serialised, so a substituted
// value containing quotes or braces cannot change the structure of the JSON.
function substituteBody(value: unknown, attribs: SvgElementAttribs, linkVariables: Map<string, string>, templateSrv: TemplateSrv): unknown {
  if (typeof value === 'string') {
    return substituteString(value, attribs, linkVariables, templateSrv);
  }
  if (Array.isArray(value)) {
    return value.map((v) => substituteBody(v, attribs, linkVariables, templateSrv));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substituteBody(v, attribs, linkVariables, templateSrv)]));
  }
  return value;
}

export function constructControlRequest(link: Link, attribs: SvgElementAttribs, linkVariables: Map<string, string>, templateSrv: TemplateSrv): ControlRequest | undefined {
  // An empty url would otherwise resolve to the current page, so reject it explicitly
  if (!link.url || !link.url.trim()) {
    return undefined;
  }
  // Reuses the tab-link url construction so relative urls and params behave the same
  const url = constructUrl(link, attribs, linkVariables, templateSrv);
  if (!url) {
    return undefined;
  }

  const headers: Record<string, string> = {};
  Object.entries(link.headers || {}).forEach(([key, val]) => {
    headers[key] = substituteString(String(val), attribs, linkVariables, templateSrv);
  });

  // 'same-origin' is the fetch default, stated explicitly so cookies (e.g. from an
  // Apache proxy session) are always sent to the control server.
  const init: RequestInit = {
    method: link.method,
    headers: headers,
    credentials: 'same-origin',
    cache: 'no-store',
  };

  if (link.body !== undefined && link.body !== null) {
    if (link.method === 'GET' || link.method === 'HEAD') {
      flowDebug().warn(`Flow panel: cell '${attribs.name}' control link body ignored for ${link.method}`);
    }
    else {
      init.body = JSON.stringify(substituteBody(link.body, attribs, linkVariables, templateSrv));
      const hasContentType = Object.keys(headers).some((key) => key.toLowerCase() === 'content-type');
      if (!hasContentType) {
        headers['Content-Type'] = 'application/json';
      }
    }
  }
  return { url, init };
}

//-----------------------------------------------------------------------------
// Transport

// Errors are returned rather than thrown so the caller can route them to the
// console and/or the cell representation.
export async function sendControlRequest(request: ControlRequest, timeoutMs: number, fetchFn: typeof fetch): Promise<HttpOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(request.url, { ...request.init, signal: controller.signal });
    const text = await response.text();
    if (response.ok) {
      return { ok: true, status: response.status, text: text };
    }
    return { ok: false, status: response.status, message: response.statusText || `HTTP ${response.status}` };
  }
  catch (err: any) {
    if (err?.name === 'AbortError') {
      return { ok: false, status: undefined, message: `timeout after ${timeoutMs}ms` };
    }
    return { ok: false, status: undefined, message: err?.message || 'network error' };
  }
  finally {
    clearTimeout(timer);
  }
}

//-----------------------------------------------------------------------------
// Result parsing

function getPath(obj: unknown, path: string): unknown {
  let cur: any = obj;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(key in cur)) {
      return undefined;
    }
    cur = cur[key];
  }
  return cur;
}

function leafValue(value: unknown): ControlResultValue {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  return null;
}

// Objects flatten to dot-separated names, e.g. {"state": {"power": 1}} under
// resultDataRef 'control' gives 'control.state.power'.
function flattenInto(value: unknown, name: string, out: Map<string, ControlResultValue>) {
  if (value !== null && typeof value === 'object') {
    Object.entries(value as object).forEach(([key, val]) => flattenInto(val, `${name}.${key}`, out));
  }
  else {
    out.set(name, leafValue(value));
  }
}

// Scalar results (JSON or plain text) are stored under resultDataRef itself. JSON
// objects and arrays are flattened under resultDataRef.<path>.
export function parseControlResult(text: string, resultDataRef: string, resultPath: string | undefined): ParseOutcome {
  const trimmed = text.trim();
  let parsed: unknown = undefined;
  let isJson = false;
  if (trimmed.length) {
    try {
      parsed = JSON.parse(trimmed);
      isJson = true;
    }
    catch {
      isJson = false;
    }
  }

  if (resultPath) {
    if (!isJson) {
      return { ok: false, message: 'response is not JSON so resultPath cannot be applied' };
    }
    parsed = getPath(parsed, resultPath);
    if (parsed === undefined) {
      return { ok: false, message: `resultPath '${resultPath}' not found in response` };
    }
  }

  const values = new Map<string, ControlResultValue>();
  if (isJson && parsed !== null && typeof parsed === 'object') {
    flattenInto(parsed, resultDataRef, values);
  }
  else if (isJson) {
    values.set(resultDataRef, leafValue(parsed));
  }
  else {
    values.set(resultDataRef, trimmed);
  }
  return { ok: true, values: values };
}

//-----------------------------------------------------------------------------
// Error representation

// Expands the ${status} and ${message} tokens in the configured error text.
export function formatControlErrorText(template: string, error: ControlError): string {
  const status = error.status !== undefined ? String(error.status) : '';
  return template.split('${status}').join(status).split('${message}').join(error.message);
}

//-----------------------------------------------------------------------------
// State

// Applies a request outcome to the panel state. Pure so it can be unit tested.
export function applyControlOutcome(state: ControlState, cellName: string, resultDataRef: string | undefined, outcome: ControlOutcome): ControlState {
  const results = new Map(state.results);
  const errors = new Map(state.errors);
  if (outcome.ok) {
    errors.delete(cellName);
    if (resultDataRef && outcome.values) {
      if (outcome.time === undefined) {
        // 'end': the whole previous result is replaced, so keys missing from this
        // response don't linger
        const prefix = `${resultDataRef}.`;
        Array.from(results.keys()).forEach((key) => {
          if (key === resultDataRef || key.startsWith(prefix)) {
            results.delete(key);
          }
        });
        outcome.values.forEach((value, key) => results.set(key, [{ time: undefined, value: value }]));
      }
      else {
        // 'received': each value is appended to its history. Keys absent from this
        // response keep their last value.
        const time = outcome.time;
        outcome.values.forEach((value, key) => {
          const points = [...(results.get(key) || []), { time: time, value: value }];
          results.set(key, points.slice(-gControlMaxPointsPerRef));
        });
      }
    }
  }
  else {
    errors.set(cellName, outcome.error);
  }
  return { results: results, errors: errors };
}

// Adds the control results to the time-series data. 'received' points are placed at
// their arrival time and hold their value. The time range is extended to the latest
// arrival so the newest result is at the live end of the time-slider. 'end' points
// are pinned to the panel's timeMax.
export function controlResultsMerge(tsData: TimeSeriesData, results: Map<string, ControlResultPoint[]>) {
  let latest = tsData.timeMax;
  results.forEach((points) => {
    points.forEach((point) => {
      if (point.time !== undefined) {
        latest = Math.max(latest, Math.ceil(point.time));
      }
    });
  });
  if (latest > tsData.timeMax) {
    tsData.timeMax = latest;
    tsData.timeRange = tsData.timeMax - tsData.timeMin;
  }

  results.forEach((points, name) => {
    const hold = points.every((point) => point.time !== undefined);
    tsData.ts.set(name, {
      time: { values: points.map((point) => point.time ?? tsData.timeMax) },
      values: points.map((point) => point.value),
      hold: hold,
    });
  });
}

//-----------------------------------------------------------------------------
// Dispatch

// Sends the request for a click on a control link and reports the outcome. Errors
// are always logged to the console; the cell representation is decided by the caller.
export async function dispatchControlLink(
  link: Link,
  attribs: SvgElementAttribs,
  linkVariables: Map<string, string>,
  templateSrv: TemplateSrv,
  fetchFn: typeof fetch,
  onOutcome: (outcome: ControlOutcome) => void): Promise<void> {

  const request = constructControlRequest(link, attribs, linkVariables, templateSrv);
  if (!request) {
    flowDebug().warn(`Flow panel: cell '${attribs.name}' control link has an invalid url`);
    onOutcome({ ok: false, error: { status: undefined, message: 'invalid url' } });
    return;
  }

  const http = await sendControlRequest(request, link.timeoutMs, fetchFn);
  if (!http.ok) {
    flowDebug().warn(`Flow panel: cell '${attribs.name}' control request ${request.init.method} ${request.url} failed: ${http.message}`);
    onOutcome({ ok: false, error: { status: http.status, message: http.message } });
    return;
  }

  let values: Map<string, ControlResultValue> | undefined = undefined;
  const time = link.resultTime === 'end' ? undefined : Date.now();
  if (link.open === 'result' && link.resultDataRef) {
    const parsed = parseControlResult(http.text, link.resultDataRef, link.resultPath);
    if (!parsed.ok) {
      flowDebug().warn(`Flow panel: cell '${attribs.name}' control response could not be used: ${parsed.message}`);
      onOutcome({ ok: false, error: { status: http.status, message: parsed.message } });
      return;
    }
    values = parsed.values;
  }

  flowDebug().info(`Flow panel: cell '${attribs.name}' control request ${request.init.method} ${request.url} returned ${http.status}`);
  onOutcome({ ok: true, values: values, time: time });
}
