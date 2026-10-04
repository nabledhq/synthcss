// SynthMCP: an MCP server whose every answer comes from synthcss.ai.json.
// createSynthServer() returns an unconnected MCP server; src/server.js connects it to
// stdio. Tools only read the contract loaded at startup and their own arguments.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { loadContract } from "./contract.js";
import { TOOLS, callTool } from "./tools.js";

export { CONTRACT_ENV, buildModel, loadContract, resolveContractPath } from "./contract.js";
export { TOOLS, callTool } from "./tools.js";

export const SERVER_NAME = "synthmcp";
const ANNOTATIONS = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

// Options: { contractPath } overrides the contract file (tests only), like the
// SYNTHMCP_CONTRACT environment variable; { model } passes an already loaded contract.
export function createSynthServer(options = {}) {
  const model = options.model ?? loadContract(options);
  const { synthVersion, contractVersion } = model;
  const server = new Server(
    { name: SERVER_NAME, title: `SynthMCP (SynthCSS ${synthVersion}, contract ${contractVersion})`, version: synthVersion },
    {
      capabilities: { tools: {} },
      instructions:
        `SynthMCP answers from the SynthCSS contract (synthcss.ai.json): SynthCSS ${synthVersion}, contract ${contractVersion}. ` +
        "Use resolve_intent or list_layouts / list_components to pick classes, get_component / get_layout / get_example for details " +
        "and validate_markup to check generated HTML. Every response is JSON with synthVersion and contractVersion.",
    },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema(model),
      annotations: ANNOTATIONS,
    })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const payload = callTool(model, request.params.name, request.params.arguments);
    return { content: [{ type: "text", text: JSON.stringify(payload) }], ...("error" in payload ? { isError: true } : {}) };
  });
  return server;
}
