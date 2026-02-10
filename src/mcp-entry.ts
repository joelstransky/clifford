#!/usr/bin/env node
import { CliffordMcpServer } from './utils/mcp-server.js';

// The project root is passed via CLIFFORD_PROJECT_ROOT env var (set in opencode.json).
// Falls back to cwd() if not set.
const projectRoot = process.env.CLIFFORD_PROJECT_ROOT || process.cwd();

const server = new CliffordMcpServer(projectRoot);
server.start().catch((err: unknown) => {
  console.error('Clifford MCP Server failed to start:', err);
  process.exit(1);
});
