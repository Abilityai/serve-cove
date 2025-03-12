/**
 * Scans a directory for markdown files and returns a structured array of resources.
 * @param {string} directory - Path to the directory containing markdown files.
 * @returns {Promise<Array<{uri: string, name: string, description: string, mimeType: string}>>} Array of resource objects.
 */
import * as fs from 'fs';
import * as path from 'path';

export const scan = async (directory) => {
  const resources = [];

  const processMarkdownFile = (filePath, baseDir) => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');

      // The first line is the resource name
      const name = lines[0].replace(/^#+\s+/, '').trim();

      // The content is everything after the first line
      const content = lines.slice(1).join('\n').trim();

      // Calculate relative path, remove the extension, and normalize path separators
      const relativePath = path.relative(baseDir, filePath);

      // Create resource object
      resources.push({
        uri: `prompthub:///${relativePath}`,
        name: name,
        mimeType: "text/markdown",
        content: content
      });
    } catch (error) {
      console.error(`Error processing markdown file ${filePath}:`, error);
    }
  };

  const scanDirectory = (dir, baseDir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath, baseDir);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        processMarkdownFile(fullPath, baseDir);
      }
    }
  };

  try {
    // Normalize the directory path to handle different path formats
    const normalizedDirectory = path.normalize(directory);
    scanDirectory(normalizedDirectory, normalizedDirectory);
    return resources;
  } catch (error) {
    console.error('Error scanning directory:', error);
    return [];
  }
};

export default scan;
