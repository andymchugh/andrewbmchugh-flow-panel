// Mock control server for the Flow panel control link example (provisioning/dashboards/controlLinks.json).
// It has no dependencies. Run it with:
//   node examples/controlServer/server.mjs [port]
// Environment:
//   PORT          listen port (default 8090)
//   ALLOW_ORIGIN  Grafana origin allowed by CORS when the panel is not served through the same
//                 proxy as this server (default http://localhost:3000)
//
// Endpoints:
//   GET  /control/pump/<name>    returns {ok, pump}
//   POST /control/pump/<name>    body {"action": "start" | "stop" | "fail" | "slow"}
//                                 'fail' returns HTTP 503 (a device-level failure)
//                                 'slow' waits 5 seconds (to exercise the panel timeout)
//   POST /control/reset          switches every pump off

import http from 'node:http';

const PORT = Number(process.argv[2] || process.env.PORT || 8090);
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || 'http://localhost:3000';
const SLOW_MS = 5000;

const pumps = new Map([
  ['pump1', { name: 'pump1', state: 'off', level: 0 }],
  ['pump2', { name: 'pump2', state: 'on', level: 40 }],
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  console.log(`Response ${status}:`, JSON.stringify(body));
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
  }
  return text ? JSON.parse(text) : {};
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pumpMatch = url.pathname.match(/^\/control\/pump\/([^/]+)$/);

  if (req.method === 'GET' && pumpMatch) {
    const pump = pumps.get(pumpMatch[1]);
    return pump ? send(res, 200, { ok: true, pump }) : send(res, 404, { ok: false, error: 'unknown pump' });
  }

  if (req.method === 'POST' && pumpMatch) {
    const pump = pumps.get(pumpMatch[1]);
    if (!pump) {
      return send(res, 404, { ok: false, error: 'unknown pump' });
    }
    let body;
    try {
      body = await readJson(req);
      console.log('POST body:', JSON.stringify(body));
    }
    catch {
      return send(res, 400, { ok: false, error: 'body is not JSON' });
    }
    switch (body.action) {
      case 'start':
        Object.assign(pump, { state: 'on', level: 50 });
        return send(res, 200, { ok: true, pump });
      case 'stop':
        Object.assign(pump, { state: 'off', level: 0 });
        return send(res, 200, { ok: true, pump });
      case 'fail':
        return send(res, 503, { ok: false, error: 'device not responding' });
      case 'slow':
        await sleep(SLOW_MS);
        return send(res, 200, { ok: true, pump });
      default:
        return send(res, 400, { ok: false, error: `unknown action '${body.action}'` });
    }
  }

  if (req.method === 'POST' && url.pathname === '/control/reset') {
    pumps.forEach((pump) => Object.assign(pump, { state: 'off', level: 0 }));
    return send(res, 200, { ok: true });
  }

  return send(res, 404, { ok: false, error: 'not found' });
}

const server = http.createServer((req, res) => {
  console.log(new Date().toISOString(), req.method, req.url, 'Origin:', req.headers.origin || '-');
  if (req.method === 'OPTIONS') {
    // CORS preflight, needed when the panel posts JSON from a different origin
    res.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOW_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }
  handle(req, res).catch((err) => send(res, 500, { ok: false, error: String(err) }));
});

server.listen(PORT, () => {
  console.log(`Flow panel mock control server listening on port ${PORT}, CORS origin ${ALLOW_ORIGIN}`);
});
