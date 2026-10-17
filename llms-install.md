# Installing MRVN DE Open Data MCP (instructions for AI agents such as Cline)

This is a **hosted remote MCP server**. There is nothing to clone, build or run locally.

- Endpoint: `https://de-opendata-mcp.pages.dev/mcp`
- Transport: Streamable HTTP (stateless JSON-RPC over `POST /mcp`; `GET /mcp` returns 405)
- Auth: HTTP header `X-RapidAPI-Key: <the user's own RapidAPI key>` (`Authorization: Bearer <key>` is also accepted)
- Tools: 12 (`tender_*`, `mastr_*`, `ladesaeulen_*`), see README.md

`tools/list` works without a key. Every tool call needs the user's key, so ask the user for it
(or tell them how to get one, see step 1) before you finish the setup. Never invent a key.

## 1. Get a free RapidAPI key (the user has to do this once)

1. Sign in or sign up at https://rapidapi.com.
2. Open the API listing(s) the user wants and subscribe to the **BASIC** plan ($0, 100 requests/day):
   - Public procurement notices: https://rapidapi.com/mrvn-mrvn-default/api/de-tender-query (tools `tender_*`)
   - MaStR energy units: https://rapidapi.com/mrvn-mrvn-default/api/de-mastr-units (tools `mastr_*`)
   - EV charging stations: https://rapidapi.com/mrvn-mrvn-default/api/de-ladesaulen-query (tools `ladesaeulen_*`)
3. Copy the key shown as `X-RapidAPI-Key` on the listing's endpoint page. One key works for all three
   APIs, but each API needs its own subscription. A tool for an API the user has not subscribed to
   returns an error starting with "RapidAPI rejected the key (401/403)".

Paid plans exist for more volume (PRO $19/month for 10,000 requests, ULTRA $79/month for 100,000).
The key is forwarded only to the RapidAPI gateway and is not stored by this server.

## 2. Add the server to the client

Replace `YOUR_RAPIDAPI_KEY` with the user's key.

### Cline (VS Code extension or CLI)

Open the MCP settings file (Cline panel → MCP Servers → Configure → "Configure MCP Servers";
CLI: `~/.cline/data/settings/cline_mcp_settings.json`) and add this entry under `mcpServers`.
`"type": "streamableHttp"` is required; without it Cline falls back to legacy SSE and will not connect.

```json
{
  "mcpServers": {
    "de-opendata": {
      "type": "streamableHttp",
      "url": "https://de-opendata-mcp.pages.dev/mcp",
      "headers": { "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY" },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "de-opendata": {
      "url": "https://de-opendata-mcp.pages.dev/mcp",
      "headers": { "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY" }
    }
  }
}
```

### Claude Code / VS Code and other clients with `"type": "http"`

Use `mcp-config.json` from this repo:

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

### Claude Desktop and other stdio-only clients (bridge via mcp-remote)

Clients that cannot send custom headers to a remote server can run the `mcp-remote` stdio bridge
(needs Node.js 18+). Edit `claude_desktop_config.json` and restart Claude Desktop:

```json
{
  "mcpServers": {
    "de-opendata": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@0.1",
        "https://de-opendata-mcp.pages.dev/mcp",
        "--transport",
        "http-only",
        "--header",
        "X-RapidAPI-Key:${RAPIDAPI_KEY}"
      ],
      "env": { "RAPIDAPI_KEY": "YOUR_RAPIDAPI_KEY" }
    }
  }
}
```

Keep `X-RapidAPI-Key:${RAPIDAPI_KEY}` without spaces (some clients split arguments on spaces);
`mcp-remote` fills in `${RAPIDAPI_KEY}` from `env`.

The `Dockerfile` in this repo wraps the same bridge. Build it and run it as a stdio server:

```bash
docker build -t mrvn-de-opendata-mcp .
docker run -i --rm -e RAPIDAPI_KEY=YOUR_RAPIDAPI_KEY mrvn-de-opendata-mcp --header 'X-RapidAPI-Key:${RAPIDAPI_KEY}'
```

## 3. Verify

1. Without a key, list the tools (expect 12 names):

```bash
curl -s -X POST https://de-opendata-mcp.pages.dev/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

2. With the key, call one tool (use the tool family of an API the user subscribed to,
   e.g. `mastr_health` or `ladesaeulen_health` instead):

```bash
curl -s -X POST https://de-opendata-mcp.pages.dev/mcp \
  -H 'Content-Type: application/json' \
  -H 'X-RapidAPI-Key: YOUR_RAPIDAPI_KEY' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"tender_health","arguments":{}}}'
```

Expected: `"isError":false` and a JSON text with `"status":"ok"` and the notice count.
If the result says "This tool needs your own RapidAPI key", the header is missing or misspelled.

In the client, a good first prompt is: "Use de-opendata to find open IT tenders (CPV 72) in Bayern."
