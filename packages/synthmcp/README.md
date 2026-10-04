# SynthMCP

A stdio [Model Context Protocol](https://modelcontextprotocol.io) server for
[SynthCSS](https://github.com/nabledhq/synthcss). Coding agents use its seven
read-only tools to query and validate SynthCSS markup:

- `list_components` and `get_component`
- `list_layouts` and `get_layout`
- `resolve_intent`
- `validate_markup`
- `get_example`

Every answer comes from `synthcss.ai.json`, the SynthCSS AI contract, and reports
`synthVersion` and `contractVersion`.

```sh
npx -y synthmcp
```

Claude Code: `claude mcp add synthcss -- npx -y synthmcp`. For Claude Desktop and other
clients, add this to the `mcpServers` map:

```json
{ "mcpServers": { "synthcss": { "command": "npx", "args": ["-y", "synthmcp"] } } }
```

Requires Node.js 18 or later. The full documentation, with every tool's arguments
and example responses, is in
[docs/mcp.md](https://github.com/nabledhq/synthcss/blob/main/docs/mcp.md).
