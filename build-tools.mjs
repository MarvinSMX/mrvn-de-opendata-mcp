// Builds tools array for the MCP worker from E2 tools.json files.
import fs from 'node:fs';
const src = [
  ['tender', '../e2-apis/de-tender-query/mcp/tools.json', 'de-tender-query.p.rapidapi.com', 'https://rapidapi.com/MarvinGaming/api/de-tender-query'],
  ['mastr', '../e2-apis/de-mastr-units/mcp/tools.json', 'de-mastr-units.p.rapidapi.com', 'https://rapidapi.com/MarvinGaming/api/de-mastr-units'],
];
const tools = [];
for (const [prefix, file, host, hub] of src) {
  const j = JSON.parse(fs.readFileSync(new URL(file, import.meta.url)));
  for (const t of j.tools) {
    const props = {}; const required = [];
    for (const [k, v] of Object.entries(t.parameters || {})) {
      const { required: r, ...rest } = v; props[k] = rest; if (r) required.push(k);
    }
    tools.push({
      name: `${prefix}_${t.name}`,
      description: `${t.description} [${prefix === 'tender' ? 'German public procurement (oeffentlichevergabe.de, CC0)' : 'German MaStR energy units (DL-DE-BY-2.0, © Bundesnetzagentur)'}]`,
      inputSchema: { type: 'object', properties: props, ...(required.length ? { required } : {}) },
      _route: { host, hub, path: t.path },
    });
  }
}
fs.writeFileSync(new URL('tools.generated.json', import.meta.url), JSON.stringify(tools, null, 2));
const worker = fs.readFileSync(new URL('worker.src.js', import.meta.url), 'utf8').replace('/*__TOOLS__*/[]', JSON.stringify(tools));
fs.writeFileSync(new URL('pages/de-opendata-mcp/_worker.js', import.meta.url), worker);
console.log('tools:', tools.length);
