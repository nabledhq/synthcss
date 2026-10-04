#!/usr/bin/env node
// The synthmcp bin: a SynthMCP server on stdio. stdout carries the protocol, so
// diagnostics go to stderr.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createSynthServer } from "./index.js";

try {
  const server = createSynthServer();
  await server.connect(new StdioServerTransport());
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
