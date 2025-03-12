Server-Sent Events (SSE): This transport uses HTTP POST requests for client-to-server communication and Server-Sent Events for server-to-client streaming.

```js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Response } from 'express';

const server = new McpServer({
  name: "example-server",
  version: "1.0.0"
}, { capabilities: {} });

const app = express();
app.use(express.json());

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res as Response);
  await server.connect(transport);
  // Store the transport instance for later use. For simplicity, we assume a single client here.
  app.locals.transport = transport;
});

app.post("/messages", async (req, res) => {
  const transport = app.locals.transport;
  await transport.handlePostMessage(req, res);
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});

// Note: For simplicity, this example doesn't handle routing for multiple connections.
// In a production environment, you'd need to route messages to the correct transport instance
// based on some identifier (e.g., a session ID).
```


# Low-Level Server

For more control, you can use the low-level Server class directly:

```js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "example-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      prompts: {}
    }
  }
);

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [{
      name: "example-prompt",
      description: "An example prompt template",
      arguments: [{
        name: "arg1",
        description: "Example argument",
        required: true
      }]
    }]
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "example-prompt") {
    throw new Error("Unknown prompt");
  }
  return {
    description: "Example prompt",
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: "Example prompt text"
      }
    }]
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```
