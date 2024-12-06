# Private Prompt Library Server

## Overview

This package provides a robust and easy-to-deploy Node.js HTTP server designed to serve a directory of Markdown files. It delivers these files as a navigable JSON index and allows access to raw Markdown files, utilizing token-based authentication for enhanced security.

## Features

- **Simple Setup**: Requires minimal configuration via a `.env` file and a directory with Markdown files of your choice.
- **Token-Based Authentication**: Secure your content using token-based authentication specified through environment variables or command-line arguments.
- **Easy Navigation**: Provides a clean JSON index of your Markdown files for easy access and navigation.
- **Fast Deployment**: Deploy quickly with a single command—no need for extensive configuration or additional code files.
- **Enhanced Error Reporting**: Offers detailed error messages to assist in troubleshooting.

## Installation

Ensure `yarn` is installed in your environment. Clone the package and navigate to its root directory:

```bash
git clone <repository-url>
cd <repository-directory>
yarn install
```

## Configuration

1. **Environment Variables or Command-Line Arguments**: You can configure the server using a `.env` file in the root directory or by passing arguments when starting the server. Add your settings either way:
   - Environment variables example (`.env` file):
     ```env
     TOKENS=token_1,token_2,token_3
     PORT=8080
     STATIC_DIR=static
     ```
   - Command-line arguments example:
     ```bash
     yarn serve --tokens token_1,token_2,token_3 --port 8080 --staticDir static
     ```

2. **Markdown Directory**: Ensure a directory with Markdown files is present at the root. Place your Markdown files here.

## Usage

Start the server using the following command:

```bash
yarn serve
```

This will initiate an HTTP server on the port specified in your `.env` file or command-line arguments (default is port 8080).

## Authentication

Access to the server requires valid authentication. Include your token either as a query parameter `?u=token` or as an `Authorization` header.

## Endpoints

- **`GET /`**: Retrieves a JSON representing the directory structure of your Markdown directory.
- **`GET /<path_to_md_file>`**: Returns the raw Markdown content of the requested file. Static files can also be accessed directly without authentication if they are in the static directory.

## Error Handling

- **401 Unauthorized**: Returned when no valid authentication is provided for Markdown files.
- **404 Not Found**: Returned when a requested file does not exist.
- **500 Internal Server Error**: Returned for unexpected errors, with detailed messages to assist in diagnosing issues.

## License

This project is licensed under the MIT License.
