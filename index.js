import dotenv from 'dotenv';
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from 'express';
import minimist from 'minimist';
import resourcesScanner from './resources.js';
import cors from 'cors';
import crypto from 'crypto';

const args = minimist(process.argv.slice(2));
const PORT = args.port || process.env.PORT || 8080;
const TOKENS = args.tokens ? args.tokens.split(',') : (process.env.TOKENS ? process.env.TOKENS.split(',') : []);
const RESOURCES_DIR = args.resourcesDir || process.env.RESOURCES_DIR || 'example';

// Create Express app
const app = express();
app.use(cors());
app.use((req, res, next) => {
  console.log(`[INI] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  res.on('finish', () => {
    console.log(`[INI] ${req.method} ${req.path} - Status: ${res.statusCode}`);
  });
  next();
});


// Store active transports (in a real application, you might want to use a more robust solution)
const activeTransports = new Map();
// Store loaded resources
let loadedResources = [];

// Token authentication middleware
const server = new Server(
  {
    name: "resource-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      resources: {}
    }
  }
);

// Load resources initially
async function loadResources() {
  try {
    console.log(`[RES] Loading resources from directory: ${RESOURCES_DIR}`);
    loadedResources = await resourcesScanner(RESOURCES_DIR);
    console.log(`[RES] Loaded ${loadedResources.length} resources`);
  } catch (error) {
    console.error('[RES] Error loading resources:', error);
  }
}

// Handle listing all resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  console.log('[RES] Handling ListResources request');
  const resources = loadedResources.map(({ uri, name, description, mimeType }) => ({
    uri,
    name,
    mimeType
  }));

  console.log('[RES] Returning resources:', resources);

  return { resources };
});

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return {
    resourceTemplates: []
  };
});

// Handle getting a specific resource
server.setRequestHandler(ReadResourceRequestSchema, async ({ params }) => {
  const resourceUri = params.uri;
  const resource = loadedResources.find(({ uri }) => uri === resourceUri);
  if (!resource) {
    throw new Error(`Unknown resource: ${resourceUri}`);
  }
  console.log('[RES] Returning resource:', resource);
  return {
    contents: [{
      uri: resource.uri,
      mimeType: resource.mimeType,
      text: resource.content
    }]
  };
});

app.get("/:token/mcp", async (req, res) => {
  const token = req.params.token;
  if (!TOKENS.includes(token)) {
    throw new Error(`Invalid token: ${token}`);
  }

  const uid = crypto.randomUUID();
  console.log(`[MCP] New MCP connection with session ID: ${uid}`);

  const transport = new SSEServerTransport(`/${token}/mcp/messages/${uid}`, res);
  activeTransports.set(uid, transport);
  // Set up cleanup on connection close
  res.on('close', () => {
    console.log(`[MCP] SSE connection closed for session: ${uid}`);
    activeTransports.delete(uid);
  });

  try {
    await server.connect(transport);
    console.log(`[MCP] Server connected to transport for session: ${uid}`);
  } catch (error) {
    console.error(`[MCP] Error connecting to transport: ${error.message}`);
    activeTransports.delete(uid);
    res.status(500).send(`Connection error: ${error.message}`);
  }
});

// Handle client-to-server messages
app.post("/:token/mcp/messages/:uid", async (req, res) => {
  const token = req.params.token;

  if (!TOKENS.includes(token)) {
    console.log(`[MSG] Invalid token: ${token}`);
    res.status(401).send("Invalid token");
    return;
  }

  const uid = req.params.uid;
  console.log(`[MSG] Handling POST message for token: ${uid}`);
  const transport = activeTransports.get(uid);
  if (!transport) {
    console.log(`[MSG] No active connection found for this token: ${uid}`);
    res.status(400).send("No active connection found for this token");
    return;
  }

  try {
    await transport.handlePostMessage(req, res);
    console.log(`[MSG] POST message handled for token: ${uid}`);
  } catch (error) {
    console.error(`[MSG] Error handling POST message: ${error.message}`);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Start the server
(async () => {
  // Load resources before starting the server
  await loadResources();

  app.listen(PORT, () => {
    console.log(`[INI] MCP server running on port ${PORT}`);
    console.log(`[INI] Tokens configured: ${TOKENS.length > 0 ? TOKENS.join(', ') : 'None'}`);
  });
})();
