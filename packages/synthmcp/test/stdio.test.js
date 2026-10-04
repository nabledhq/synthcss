// Starts the real server as a child process the three documented ways and talks to
// it over stdio with the SDK client.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const PACKAGE = fileURLToPath(new URL("..", import.meta.url));
const REPO = fileURLToPath(new URL("../../..", import.meta.url));
const BIN = fileURLToPath(new URL("../../../node_modules/.bin/synthmcp", import.meta.url));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

async function listOverStdio(params) {
  const transport = new StdioClientTransport({ ...params, stderr: "pipe" });
  const client = new Client({ name: "synthmcp-stdio-test", version: "0.0.0" });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    const result = await client.callTool({ name: "resolve_intent", arguments: { intent: "row of tags that wraps" } });
    return { tools, answer: JSON.parse(result.content[0].text), info: client.getServerVersion() };
  } finally {
    await client.close();
  }
}

const check = ({ tools, answer, info }) => {
  assert.equal(tools.length, 7);
  assert.equal(answer.class, ".cluster");
  assert.equal(info.name, "synthmcp");
};

test("node packages/synthmcp/src/server.js serves MCP over stdio", { timeout: 20000 }, async () => {
  check(await listOverStdio({ command: process.execPath, args: ["packages/synthmcp/src/server.js"], cwd: REPO }));
});

test("the synthmcp bin serves MCP over stdio", { timeout: 20000, skip: !existsSync(BIN) && "node_modules/.bin/synthmcp is not linked" }, async () => {
  check(await listOverStdio({ command: BIN, args: [], cwd: PACKAGE }));
});

test("npm run mcp serves MCP over stdio", { timeout: 30000 }, async () => {
  check(await listOverStdio({ command: npm, args: ["run", "--silent", "mcp"], cwd: REPO }));
});

test("the server exits with a message when the contract cannot be read", { timeout: 20000 }, async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["src/server.js"],
    cwd: PACKAGE,
    env: { ...process.env, SYNTHMCP_CONTRACT: "/nonexistent/synthcss.ai.json" },
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr.on("data", (d) => (stderr += d));
  const client = new Client({ name: "synthmcp-stdio-test", version: "0.0.0" });
  await assert.rejects(client.connect(transport));
  assert.match(stderr, /cannot read the SynthCSS contract at \/nonexistent/);
});
