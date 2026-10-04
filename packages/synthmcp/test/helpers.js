// Test helpers: an SDK client connected to SynthMCP over an in-memory transport.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { readFileSync } from "node:fs";
import { createSynthServer } from "../src/index.js";

export const REPO_CONTRACT = new URL("../../../synthcss.ai.json", import.meta.url);
export const readContract = () => JSON.parse(readFileSync(REPO_CONTRACT, "utf8"));

export async function connect(options = {}) {
  const server = createSynthServer(options);
  const client = new Client({ name: "synthmcp-test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const call = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args });
    assertTextResult(result);
    return { ...JSON.parse(result.content[0].text), isError: result.isError === true };
  };
  return { client, server, call, close: () => client.close() };
}

function assertTextResult(result) {
  if (result.content.length !== 1 || result.content[0].type !== "text") {
    throw new Error(`expected one text content item, got ${JSON.stringify(result.content)}`);
  }
}

// Every public contract class: layouts, components, parts and variants, minus internal ones.
export function publicClasses(contract) {
  const all = [...Object.keys(contract.layouts)];
  for (const [name, comp] of Object.entries(contract.components)) all.push(name, ...Object.keys(comp.parts), ...Object.keys(comp.variants));
  const internal = new Set(contract.internal.classes);
  return new Set(all.filter((c) => !internal.has(c)));
}

export const classAttrs = (html) => [...html.matchAll(/\bclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean));
