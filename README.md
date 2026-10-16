# MRVN DE Open Data MCP

By **MRVN**.

<!-- mcp-name: io.github.MarvinSMX/mrvn-de-opendata-mcp -->

Remote MCP server (Streamable HTTP, stateless) giving AI agents access to German open data:

- **Public procurement notices** from [oeffentlichevergabe.de](https://oeffentlichevergabe.de) – search by keyword, CPV code, Bundesland, value, deadline.
- **Energy units from the Marktstammdatenregister (MaStR)** of the Bundesnetzagentur – solar, wind, storage etc., by location, technology, capacity.
- **EV charging stations from the Ladesäulenregister** of the Bundesnetzagentur – by PLZ, Bundesland, power (kW), plug type, operator, radius or bounding box.

Endpoint: `https://de-opendata-mcp.pages.dev/mcp` · Landing page: https://de-opendata-mcp.pages.dev/

## Tools (12)
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
| `ladesaeulen_search_stations` | Search EV charging stations |
| `ladesaeulen_get_station` | Get one station by Ladeeinrichtungs-ID |
| `ladesaeulen_get_stats` | Aggregate station stats |
| `ladesaeulen_health` | Data freshness / health |

`tools/list` works without a key. Tool calls require **your own RapidAPI key**, subscribed to
[DE Tender Query][tender], [DE MaStR Units][mastr] and/or
[DE Ladesäulen Query][ladesaeulen]. Each has a free BASIC plan (100 requests/day); paid plans exist for higher volume. Your key is forwarded only to the RapidAPI gateway and is not stored.

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

## OpenAPI specs (REST via RapidAPI)
The three backing REST APIs are described in `openapi/` (OpenAPI 3.0.3, server = RapidAPI gateway, header `X-RapidAPI-Key`):
- `openapi/de-tender-query.openapi.yaml`: German public procurement notices
- `openapi/de-mastr-units.openapi.yaml`: MaStR energy units
- `openapi/de-ladesaulen-query.openapi.yaml`: EV charging stations (Ladesäulenregister)

## License & data attribution
- Code: MIT (see `LICENSE`).
- Procurement data: oeffentlichevergabe.de, published under CC0 1.0.
- EV charging station data: Bundesnetzagentur.de, Ladesäulenregister, CC BY 4.0; reformatted.
- MaStR data: © Bundesnetzagentur – Marktstammdatenregister (MaStR), https://www.marktstammdatenregister.de/MaStR/Datendownload. License: Datenlizenz Deutschland – Namensnennung – Version 2.0 (dl-de/by-2-0), https://www.govdata.de/dl-de/by-2-0. Data modified (normalized). Not an official service.

<!-- RapidAPI listing URLs: single place to update in this README (also build-tools.mjs, worker.src.js, smoke.mjs) -->
[tender]: https://rapidapi.com/mrvn-mrvn-default/api/de-tender-query
[mastr]: https://rapidapi.com/mrvn-mrvn-default/api/de-mastr-units
[ladesaeulen]: https://rapidapi.com/mrvn-mrvn-default/api/de-ladesaulen-query

## Privacy

The server keeps an anonymous per-tool call counter: one count per `tools/call` per tool name per UTC day (Workers KV). No IPs, API keys, user agents or arguments are stored. Your RapidAPI key is only forwarded to the RapidAPI gateway.
