#!/usr/bin/env node
import { CliffordMcpServer } from './utils/mcp-server.js';

const server = new CliffordMcpServer();
server.start().catch((err: unknown) => {
  console.error('Clifford MCP Server failed to start:', err);
  process.exit(1);
});
