import { TemplateSrv } from '@grafana/runtime';
import { Link, linkControlNormalise } from 'components/Config';
import {
  ControlState, applyControlOutcome, gControlMaxPointsPerRef, constructControlRequest, controlResultsMerge, dispatchControlLink,
  formatControlErrorText, parseControlResult, sendControlRequest } from 'components/ControlLink';
import { SvgElementAttribs } from 'components/SvgUpdater';
import { TimeSeriesData, seriesInterpolate } from 'components/TimeSeries';

const templateSrv = { replace: (s: string) => s.split('${grafanaVar}').join('gv-value') } as unknown as TemplateSrv;

const attribs: SvgElementAttribs = {
  name: 'pumpCell',
  dataRef: 'pump-data',
  link: null,
  clickActions: null,
  strokeColor: null,
  fillColor: null,
  styleColor: null,
  styleStrokeColor: null,
  styleFillColor: null,
};

function makeLink(overrides: Partial<Link> = {}): Link {
  const link: Link = {
    url: '/control/action',
    params: 'none',
    sameTab: undefined,
    open: 'silent',
    method: 'GET',
    body: undefined,
    headers: undefined,
    resultDataRef: undefined,
    resultPath: undefined,
    resultTime: 'received',
    timeoutMs: 5000,
    error: undefined,
    ...overrides,
  };
  return link;
}

const noVars = new Map<string, string>();

//-----------------------------------------------------------------------------
// Config normalisation

test('linkControlNormalise defaults and validation', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

  const plain = makeLink({ open: undefined as any, method: undefined as any, timeoutMs: undefined as any, resultTime: undefined as any });
  linkControlNormalise(plain, 'c1');
  expect(plain.open).toEqual('tab');
  expect(plain.method).toEqual('GET');
  expect(plain.timeoutMs).toEqual(5000);
  expect(plain.resultTime).toEqual('received');

  const badTime = makeLink({ resultTime: 'soon' as any });
  linkControlNormalise(badTime, 'c1b');
  expect(badTime.resultTime).toEqual('received');

  const bad = makeLink({ open: 'label' as any });
  linkControlNormalise(bad, 'c2');
  expect(bad.open).toEqual('tab');

  const resultNoRef = makeLink({ open: 'result' });
  linkControlNormalise(resultNoRef, 'c3');
  expect(resultNoRef.open).toEqual('silent');

  const post = makeLink({ method: 'post' as any, open: 'result', resultDataRef: 'ctl' });
  linkControlNormalise(post, 'c4');
  expect(post.method).toEqual('POST');
  expect(post.open).toEqual('result');
  warn.mockRestore();
});

//-----------------------------------------------------------------------------
// Request construction

test('constructControlRequest substitutes url, headers and body', () => {
  const vars = new Map([['siteHost', 'http://ctrl:8080']]);
  const link = makeLink({
    url: '${siteHost}/device/${cell.name}',
    method: 'POST',
    headers: { 'X-Token': '${grafanaVar}' },
    body: { state: 'on', name: '${cell.dataRef}', nested: { v: '${grafanaVar}' }, list: ['${cell.name}', 3] },
  });
  const req = constructControlRequest(link, attribs, vars, templateSrv);
  expect(req?.url).toEqual('http://ctrl:8080/device/pumpCell');
  expect(req?.init.method).toEqual('POST');
  expect(req?.init.credentials).toEqual('same-origin');
  expect((req?.init.headers as Record<string, string>)['X-Token']).toEqual('gv-value');
  expect((req?.init.headers as Record<string, string>)['Content-Type']).toEqual('application/json');
  expect(JSON.parse(req?.init.body as string)).toEqual({
    state: 'on', name: 'pump-data', nested: { v: 'gv-value' }, list: ['pumpCell', 3],
  });
});

test('constructControlRequest keeps quotes in substituted values inside the JSON string', () => {
  const vars = new Map([['evil', 'a", "x": "b']]);
  const link = makeLink({ method: 'PUT', body: { name: '${evil}' } });
  const req = constructControlRequest(link, attribs, vars, templateSrv);
  expect(JSON.parse(req?.init.body as string)).toEqual({ name: 'a", "x": "b' });
});

test('constructControlRequest ignores body on GET and keeps an explicit content type', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const getReq = constructControlRequest(makeLink({ body: { a: 1 } }), attribs, noVars, templateSrv);
  expect(getReq?.init.body).toBeUndefined();
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();

  const postReq = constructControlRequest(makeLink({
    method: 'POST', body: 'raw', headers: { 'content-type': 'text/plain' },
  }), attribs, noVars, templateSrv);
  expect(postReq?.init.body).toEqual('"raw"');
  expect(Object.keys(postReq?.init.headers as object)).toEqual(['content-type']);
});

test('constructControlRequest returns undefined for an empty url', () => {
  expect(constructControlRequest(makeLink({ url: '' }), attribs, noVars, templateSrv)).toBeUndefined();
});

//-----------------------------------------------------------------------------
// Transport

// jsdom has no Response global so a minimal stand-in with the fields used is returned
function fetchResponding(status: number, body: string, statusText = ''): typeof fetch {
  return (async () => ({
    ok: status >= 200 && status < 300,
    status: status,
    statusText: statusText,
    text: async () => body,
  })) as unknown as typeof fetch;
}

test('sendControlRequest success returns status and text', async () => {
  const out = await sendControlRequest({ url: 'http://x', init: {} }, 1000, fetchResponding(200, 'hello'));
  expect(out).toEqual({ ok: true, status: 200, text: 'hello' });
});

test('sendControlRequest non-2xx returns status and statusText', async () => {
  const out = await sendControlRequest({ url: 'http://x', init: {} }, 1000, fetchResponding(503, '', 'Unavailable'));
  expect(out).toEqual({ ok: false, status: 503, message: 'Unavailable' });
});

test('sendControlRequest network failure returns a message', async () => {
  const failing = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
  const out = await sendControlRequest({ url: 'http://x', init: {} }, 1000, failing);
  expect(out).toEqual({ ok: false, status: undefined, message: 'Failed to fetch' });
});

test('sendControlRequest times out when the server never answers', async () => {
  const hanging = ((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => {
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    });
  })) as unknown as typeof fetch;
  const out = await sendControlRequest({ url: 'http://x', init: {} }, 10, hanging);
  expect(out).toEqual({ ok: false, status: undefined, message: 'timeout after 10ms' });
});

//-----------------------------------------------------------------------------
// Result parsing

test('parseControlResult scalar json and text', () => {
  expect(parseControlResult('42', 'ctl', undefined)).toEqual({ ok: true, values: new Map([['ctl', 42]]) });
  expect(parseControlResult('true', 'ctl', undefined)).toEqual({ ok: true, values: new Map([['ctl', 1]]) });
  expect(parseControlResult('"on"', 'ctl', undefined)).toEqual({ ok: true, values: new Map([['ctl', 'on']]) });
  expect(parseControlResult(' running \n', 'ctl', undefined)).toEqual({ ok: true, values: new Map([['ctl', 'running']]) });
  expect(parseControlResult('null', 'ctl', undefined)).toEqual({ ok: true, values: new Map([['ctl', null]]) });
});

test('parseControlResult flattens json objects to dot-separated dataRefs', () => {
  const body = JSON.stringify({ state: { power: true, mode: 'eco' }, temps: [20.5, 21], gone: null });
  const out = parseControlResult(body, 'ctl', undefined);
  expect(out).toEqual({
    ok: true,
    values: new Map<string, any>([
      ['ctl.state.power', 1],
      ['ctl.state.mode', 'eco'],
      ['ctl.temps.0', 20.5],
      ['ctl.temps.1', 21],
      ['ctl.gone', null],
    ]),
  });
});

test('parseControlResult resultPath selects a sub-tree', () => {
  const body = JSON.stringify({ data: { device: { power: 0, level: 7 } } });
  const out = parseControlResult(body, 'ctl', 'data.device');
  expect(out).toEqual({
    ok: true,
    values: new Map<string, any>([['ctl.power', 0], ['ctl.level', 7]]),
  });
});

test('parseControlResult reports resultPath problems', () => {
  expect(parseControlResult('{"a":1}', 'ctl', 'b')).toEqual({ ok: false, message: "resultPath 'b' not found in response" });
  expect(parseControlResult('plain text', 'ctl', 'a').ok).toBe(false);
});

//-----------------------------------------------------------------------------
// Error representation

test('formatControlErrorText expands status and message tokens', () => {
  const err = { status: 503, message: 'Unavailable' };
  expect(formatControlErrorText('ERR ${status}: ${message}', err)).toEqual('ERR 503: Unavailable');
  expect(formatControlErrorText('x${status}', { status: undefined, message: 'timeout' })).toEqual('x');
});

//-----------------------------------------------------------------------------
// State

const pts = (...items: Array<[number | undefined, any]>) => items.map(([time, value]) => ({ time: time, value: value }));

test('applyControlOutcome: errors are set and cleared per cell', () => {
  const empty: ControlState = { results: new Map(), errors: new Map() };
  const failed = applyControlOutcome(empty, 'cellA', 'ctl', { ok: false, error: { status: 500, message: 'Server' } });
  expect(failed.errors.get('cellA')).toEqual({ status: 500, message: 'Server' });

  const ok = applyControlOutcome(failed, 'cellA', 'ctl', { ok: true, values: undefined, time: 1 });
  expect(ok.errors.has('cellA')).toBe(false);
  // The previous state objects are not mutated
  expect(failed.errors.has('cellA')).toBe(true);
});

test('applyControlOutcome: received results append history and hold the last value', () => {
  let state: ControlState = { results: new Map([['other', pts([undefined, 5])]]), errors: new Map() };
  state = applyControlOutcome(state, 'c', 'ctl', { ok: true, time: 100, values: new Map<string, any>([['ctl.a', 1], ['ctl.b', 2]]) });
  state = applyControlOutcome(state, 'c', 'ctl', { ok: true, time: 200, values: new Map<string, any>([['ctl.a', 9]]) });
  expect(state.results.get('other')).toEqual(pts([undefined, 5]));
  expect(state.results.get('ctl.a')).toEqual(pts([100, 1], [200, 9]));
  // 'ctl.b' was absent from the second response so it keeps its last value
  expect(state.results.get('ctl.b')).toEqual(pts([100, 2]));
});

test('applyControlOutcome: received history is capped', () => {
  let state: ControlState = { results: new Map(), errors: new Map() };
  for (let i = 0; i < gControlMaxPointsPerRef + 10; i++) {
    state = applyControlOutcome(state, 'c', 'ctl', { ok: true, time: i, values: new Map<string, any>([['ctl', i]]) });
  }
  const points = state.results.get('ctl') || [];
  expect(points.length).toEqual(gControlMaxPointsPerRef);
  expect(points[0].time).toEqual(10);
});

test('applyControlOutcome: end results replace the previous object result', () => {
  let state: ControlState = { results: new Map([['other', pts([undefined, 5])]]), errors: new Map() };
  state = applyControlOutcome(state, 'c', 'ctl', { ok: true, time: undefined, values: new Map<string, any>([['ctl.a', 1], ['ctl.b', 2]]) });
  expect(Array.from(state.results.entries())).toEqual([['other', pts([undefined, 5])], ['ctl.a', pts([undefined, 1])], ['ctl.b', pts([undefined, 2])]]);

  state = applyControlOutcome(state, 'c', 'ctl', { ok: true, time: undefined, values: new Map<string, any>([['ctl.a', 9]]) });
  expect(Array.from(state.results.entries())).toEqual([['other', pts([undefined, 5])], ['ctl.a', pts([undefined, 9])]]);

  // A scalar result replaces an object result of the same name
  state = applyControlOutcome(state, 'c', 'ctl', { ok: true, time: undefined, values: new Map<string, any>([['ctl', 3]]) });
  expect(Array.from(state.results.entries())).toEqual([['other', pts([undefined, 5])], ['ctl', pts([undefined, 3])]]);
});

test('applyControlOutcome: silent success leaves results untouched', () => {
  const state: ControlState = { results: new Map([['ctl', pts([undefined, 1])]]), errors: new Map() };
  const next = applyControlOutcome(state, 'c', undefined, { ok: true, values: undefined, time: 5 });
  expect(Array.from(next.results.entries())).toEqual([['ctl', pts([undefined, 1])]]);
});

//-----------------------------------------------------------------------------
// Merge into time-series data

test('controlResultsMerge: end results are pinned to timeMax', () => {
  const tsData: TimeSeriesData = { timeMin: 1000, timeMax: 2000, timeRange: 1000, ts: new Map() };
  controlResultsMerge(tsData, new Map<string, any>([['ctl.state', pts([undefined, 'on'])], ['ctl.level', pts([undefined, 7])]]));
  expect(tsData.timeMax).toEqual(2000);
  seriesInterpolate(tsData, 0.25);
  const ts = tsData.ts.get('ctl.level');
  expect(ts?.values[ts.time.valuesIndex as number]).toEqual(7);
  const ts2 = tsData.ts.get('ctl.state');
  expect(ts2?.values[ts2.time.valuesIndex as number]).toEqual('on');
});

test('controlResultsMerge: received results hold last value and extend the time range', () => {
  const tsData: TimeSeriesData = { timeMin: 1000, timeMax: 2000, timeRange: 1000, ts: new Map() };
  controlResultsMerge(tsData, new Map<string, any>([['ctl', pts([1500, 'a'], [2500, 'b'])]]));
  expect(tsData.timeMax).toEqual(2500);
  expect(tsData.timeRange).toEqual(1500);

  const valueAt = (scalar: number) => {
    seriesInterpolate(tsData, scalar);
    const ts = tsData.ts.get('ctl');
    return ts?.values[ts.time.valuesIndex as number];
  };
  // Before the first result there is no value
  expect(valueAt(0)).toBeUndefined();
  // Between the results the first one holds
  expect(valueAt((1600 - 1000) / 1500)).toEqual('a');
  // At the live end the latest result is shown
  expect(valueAt(1)).toEqual('b');
});

//-----------------------------------------------------------------------------
// Dispatch

test('dispatchControlLink result mode reports parsed values', async () => {
  const info = jest.spyOn(console, 'info').mockImplementation(() => {});
  const outcomes: any[] = [];
  await dispatchControlLink(
    makeLink({ open: 'result', resultDataRef: 'ctl' }), attribs, noVars, templateSrv,
    fetchResponding(200, '{"power":1}'), (o) => outcomes.push(o));
  expect(outcomes).toEqual([{ ok: true, values: new Map([['ctl.power', 1]]), time: expect.any(Number) }]);
  info.mockRestore();
});

test('dispatchControlLink failures are logged and reported as errors', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const outcomes: any[] = [];
  await dispatchControlLink(
    makeLink({ open: 'silent' }), attribs, noVars, templateSrv,
    fetchResponding(401, '', 'Unauthorized'), (o) => outcomes.push(o));
  expect(outcomes).toEqual([{ ok: false, error: { status: 401, message: 'Unauthorized' } }]);
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});

test('dispatchControlLink result mode with a non-JSON body reports an error', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const outcomes: any[] = [];
  await dispatchControlLink(
    makeLink({ open: 'result', resultDataRef: 'ctl', resultPath: 'a' }), attribs, noVars, templateSrv,
    fetchResponding(200, '<html></html>'), (o) => outcomes.push(o));
  expect(outcomes[0].ok).toBe(false);
  warn.mockRestore();
});
