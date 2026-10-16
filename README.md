# MRVN DE Open Data MCP

By **MRVN**.

<!-- mcp-name: io.github.MarvinSMX/mrvn-de-opendata-mcp -->

Remote MCP server (Streamable HTTP, stateless) giving AI agents access to German open data:

- **Public procurement notices** from [oeffentlichevergabe.de](https://oeffentlichevergabe.de) – search by keyword, CPV code, Bundesland, value, deadline.
- **Energy units from the Marktstammdatenregister (MaStR)** of the Bundesnetzagentur – solar, wind, storage etc., by location, technology, capacity.

Endpoint: `https://de-opendata-mcp.pages.dev/mcp` · Landing page: https://de-opendata-mcp.pages.dev/

## Tools (8)
| Tool | Purpose |
|---|---|
| `tender_search_notices` | Search procurement notices |
| `tender_get_notice` | Get one notice by ID |
| `tender_get_stats` | Aggregate tender stats |
| `tender_health` | Data freshness / health |
| `mastr_search_units` | Search MaStR energy units |
| `mastr_get_unit` | Get one unit by MaStR number |
| `mastr_get_stats` | Aggregate unit stats |
| `mastr_health` | Data freshness / health |

`tools/list` works without a key. Tool calls require **your own RapidAPI key**, subscribed to
[DE Tender Query][tender] and/or
[DE MaStR Units][mastr]. Each has a free BASIC plan (100 requests/day); paid plans exist for higher volume. Your key is forwarded only to the RapidAPI gateway and is not stored.

## Config
```json
{
  "mcpServers": {
    "de-opendata": {
      "type": "http",
      "url": "https://de-opendata-mcp.pages.dev/mcp",
      "headers": { "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY" }
    }
  }
}
```
`Authorization: Bearer <key>` is also accepted.

## Source
`worker.src.js` is the Cloudflare Pages worker (JSON-RPC over POST `/mcp`, protocol versions 2025-06-18 / 2025-03-26 / 2024-11-05). `build-tools.mjs` injects tool definitions (`tools.generated.json`); `smoke.mjs` runs a smoke test against a URL.

## License & data attribution
- Code: MIT (see `LICENSE`).
- Procurement data: oeffentlichevergabe.de, published under CC0 1.0.
- MaStR data: © Bundesnetzagentur, Marktstammdatenregister, Datenlizenz Deutschland – Namensnennung – Version 2.0 (dl-de/by-2-0), www.marktstammdatenregister.de. Data may be processed/filtered; no affiliation with or endorsement by the publishers.

<!-- RapidAPI listing URLs: single place to update in this README (also build-tools.mjs, worker.src.js, smoke.mjs) -->
[tender]: https://rapidapi.com/mrvn-mrvn-default/api/de-tender-query
[mastr]: https://rapidapi.com/mrvn-mrvn-default/api/de-mastr-units
