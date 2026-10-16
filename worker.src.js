// DE Open Data MCP — stateless Streamable-HTTP MCP server (JSON responses).
// Forwards tool calls to the RapidAPI gateway with the CALLER's own RapidAPI key,
// so usage and billing stay on RapidAPI plans (free BASIC 100/day, PRO, ULTRA).
const TOOLS = /*__TOOLS__*/[];
const SERVER = { name: 'de-opendata-mcp', version: '0.1.0' };
const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, accept, authorization, x-rapidapi-key, mcp-session-id, mcp-protocol-version',
  'Access-Control-Expose-Headers': 'mcp-session-id',
};
const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...CORS, ...extra } });

function apiKey(req) {
  const h = req.headers.get('x-rapidapi-key');
  if (h) return h.trim();
  const a = req.headers.get('authorization') || '';
  const m = a.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

const SUBSCRIBE_HINT = (hub) =>
  `This tool needs your own RapidAPI key. Subscribe (free BASIC plan: 100 requests/day) at ${hub} , then add the header "X-RapidAPI-Key: <your key>" to this MCP server's config.`;

async function callTool(name, args, key) {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) return { error: { code: -32602, message: `Unknown tool: ${name}` } };
  const { host, hub } = t._route;
  if (!key) return { result: { content: [{ type: 'text', text: SUBSCRIBE_HINT(hub) }], isError: true } };
  let path = t._route.path;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(args || {})) {
    if (v === undefined || v === null || v === '') continue;
    if (path.includes(`{${k}}`)) path = path.replace(`{${k}}`, encodeURIComponent(String(v)));
    else if (k in (t.inputSchema.properties || {})) qs.set(k, String(v));
  }
  if (/\{[^}]+\}/.test(path)) return { result: { content: [{ type: 'text', text: `Missing required argument in ${t._route.path}` }], isError: true } };
  const url = `https://${host}${path}${qs.toString() ? '?' + qs : ''}`;
  let r, body;
  try {
    r = await fetch(url, { headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': host, accept: 'application/json' } });
    body = await r.text();
  } catch (e) {
    return { result: { content: [{ type: 'text', text: `Upstream error: ${e.message}` }], isError: true } };
  }
  if (r.status === 401 || r.status === 403) {
    return { result: { content: [{ type: 'text', text: `RapidAPI rejected the key (${r.status}): ${body.slice(0, 300)}\n${SUBSCRIBE_HINT(hub)}` }], isError: true } };
  }
  if (r.status === 429) {
    return { result: { content: [{ type: 'text', text: `Rate/quota limit reached on your RapidAPI plan (${body.slice(0, 200)}). Upgrade at ${hub}/pricing` }], isError: true } };
  }
  const text = body.length > 60000 ? body.slice(0, 60000) + '\n…[truncated; use limit/fields=compact]' : body;
  return { result: { content: [{ type: 'text', text }], isError: !r.ok } };
}

async function handleRpc(msg, key) {
  const { id, method, params } = msg || {};
  const isNotification = id === undefined || id === null;
  const ok = (result) => ({ jsonrpc: '2.0', id, result });
  const err = (code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
  if (!msg || msg.jsonrpc !== '2.0' || typeof method !== 'string') return err(-32600, 'Invalid Request');
  if (isNotification) return null;
  switch (method) {
    case 'initialize': {
      const want = params?.protocolVersion;
      return ok({
        protocolVersion: PROTOCOLS.includes(want) ? want : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions: 'German open data for agents: public procurement notices (oeffentlichevergabe.de) and MaStR energy units (Bundesnetzagentur). Tool calls need your RapidAPI key header (free plan available).',
      });
    }
    case 'ping': return ok({});
    case 'tools/list': return ok({ tools: TOOLS.map(({ _route, ...t }) => t) });
    case 'tools/call': {
      const r = await callTool(params?.name, params?.arguments, key);
      return r.error ? err(r.error.code, r.error.message) : ok(r.result);
    }
    case 'resources/list': return ok({ resources: [] });
    case 'prompts/list': return ok({ prompts: [] });
    default: return err(-32601, `Method not found: ${method}`);
  }
}

const LANDING = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DE Open Data MCP — German tenders + MaStR energy units for AI agents</title>
<style>body{font:16px/1.55 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;color:#111}code,pre{background:#f4f4f5;border-radius:6px}pre{padding:12px;overflow:auto}code{padding:1px 4px}</style></head><body>
<h1>DE Open Data MCP</h1>
<p>A remote MCP server that gives Cursor, Claude and other AI agents search over two German open-data sources:</p>
<ul><li><b>Public procurement notices</b> from oeffentlichevergabe.de (CC0): filter by keyword, CPV, Bundesland, value, deadline.</li>
<li><b>MaStR energy units</b> from the Marktstammdatenregister (DL-DE-BY-2.0, © Bundesnetzagentur): solar, wind, storage and more by PLZ, type, capacity.</li></ul>
<h2>Install</h2>
<p>1. Get a RapidAPI key and subscribe (free BASIC plan, 100 requests/day) to <a href="https://rapidapi.com/MarvinGaming/api/de-tender-query">DE Tender Query</a> and/or <a href="https://rapidapi.com/MarvinGaming/api/de-mastr-units">DE MaStR Units</a>.</p>
<p>2. Add to your MCP config (Cursor <code>~/.cursor/mcp.json</code>, Claude Desktop, etc.):</p>
<pre>{
  "mcpServers": {
    "de-opendata": {
      "url": "https://de-opendata-mcp.pages.dev/mcp",
      "headers": { "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY" }
    }
  }
}</pre>
<h2>Tools</h2><ul>${TOOLS.map((t) => `<li><code>${t.name}</code> — ${t.description.replace(/</g, '&lt;')}</li>`).join('')}</ul>
<p>Transport: Streamable HTTP (stateless, JSON responses) at <code>/mcp</code>. Your key is forwarded only to the RapidAPI gateway and never stored.</p>
</body></html>`;

export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(LANDING, { headers: { 'content-type': 'text/html; charset=utf-8', ...CORS } });
    }
    if (url.pathname === '/health') return json({ status: 'ok', server: SERVER, tools: TOOLS.length });
    if (url.pathname === '/.well-known/mcp.json' || url.pathname === '/server.json') {
      return json({ name: SERVER.name, version: SERVER.version, transport: 'streamable-http', url: `${url.origin}/mcp`, auth: { type: 'header', header: 'X-RapidAPI-Key' }, tools: TOOLS.map((t) => t.name) });
    }
    if (url.pathname !== '/mcp') return json({ error: 'not_found' }, 404);
    if (req.method === 'GET') return new Response('SSE stream not supported; use POST', { status: 405, headers: { Allow: 'POST', ...CORS } });
    if (req.method === 'DELETE') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST', ...CORS } });
    let body;
    try { body = await req.json(); } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400); }
    const key = apiKey(req);
    if (Array.isArray(body)) {
      const out = (await Promise.all(body.map((m) => handleRpc(m, key)))).filter(Boolean);
      return out.length ? json(out) : new Response(null, { status: 202, headers: CORS });
    }
    const res = await handleRpc(body, key);
    return res ? json(res) : new Response(null, { status: 202, headers: CORS });
  },
};
