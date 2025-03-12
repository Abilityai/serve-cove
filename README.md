# Cove - MCP Prompt Server

A Model Context Protocol (MCP) server that serves prompt templates from markdown files.

## Installation

```bash
npm install
# or
yarn install
```

## Usage

Start the server:

```bash
node index.js
```

### Configuration Options

The server can be configured through command-line arguments or environment variables:

- `--port` or `PORT`: Port number (default: 8080)
- `--tokens` or `TOKENS`: Comma-separated list of authentication tokens
- `--promptsDir` or `PROMPTS_DIR`: Directory containing prompt templates (default: 'prompts')

Example:

```bash
node index.js --port 3000 --tokens token1,token2 --promptsDir ./my-prompts
```

Or with environment variables (using a .env file):

```
PORT=3000
TOKENS=token1,token2
PROMPTS_DIR=./my-prompts
```

## Prompt Format

Prompts should be stored as markdown files in the prompts directory. The first line should be a heading with the prompt title, and the rest of the file will be used as the prompt content.

Example:

```markdown
# Example Prompt

This is an example prompt to test the MCP server functionality.

You can use this prompt to create content or answer questions.
```

## API Endpoints

- `GET /sse`: Server-Sent Events endpoint for server-to-client communication
- `POST /messages?connectionId=<id>`: Endpoint for client-to-server messages
- `GET /health`: Health check endpoint

## Authentication

If tokens are configured, clients must include an Authorization header with a Bearer token:

```
Authorization: Bearer <token>
```

If no tokens are configured, the server allows open access.

## MCP Client Integration

To use this server with an MCP client:

```javascript
import { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const transport = new SSEClientTransport({
  sseUrl: 'http://localhost:8080/sse',
  postUrl: 'http://localhost:8080/messages',
  headers: {
    'Authorization': 'Bearer yourtoken' // If needed
  }
});

const client = new McpClient();
await client.connect(transport);

// List available prompts
const prompts = await client.listPrompts();
console.log(prompts);

// Get a specific prompt
const prompt = await client.getPrompt(prompts[0].name);
console.log(prompt);
```

## License

This project is licensed under the MIT License.
