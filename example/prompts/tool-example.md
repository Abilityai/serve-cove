---
mcp:
  type: "tool"
  name: "File Search Tool"
  description: "Search for files in a directory"
  schema:
    description: "Search for files in a directory"
    parameters:
      query:
        type: "string"
        description: "Search query"
      directory:
        type: "string"
        description: "Directory to search in"
        default: "."
---

# File Search Tool

This is an example of a tool definition that can be used with MCP-compatible applications.

The tool allows searching for files in a specified directory using a query string.

## Usage

To use this tool, provide a search query and optionally specify a directory to search in.

## Example

Search for all JavaScript files in the current directory:
```
{
  "query": "*.js",
  "directory": "."
}
``` 