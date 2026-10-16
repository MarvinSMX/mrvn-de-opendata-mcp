# MRVN DE Open Data MCP – stdio bridge to the hosted server
# Runs a local stdio MCP server that proxies to https://de-opendata-mcp.pages.dev/mcp
FROM node:20-alpine
RUN npm install -g mcp-remote@0.1
ENTRYPOINT ["mcp-remote", "https://de-opendata-mcp.pages.dev/mcp"]
