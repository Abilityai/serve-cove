require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const minimist = require('minimist');

const app = express();

const args = minimist(process.argv.slice(2));
const PORT = args.port || process.env.PORT || 8080;
const TOKENS = args.tokens ? args.tokens.split(',') : (process.env.TOKENS ? process.env.TOKENS.split(',') : []);
const PROMPTS_DIR = args.promptsDir || process.env.PROMPTS_DIR || 'prompts';
const STATIC_DIR = args.staticDir || process.env.STATIC_DIR || 'static';

const checkAuth = (req) => {
  const token = req.query.u || req.query.token || req.get('Authorization');
  console.log({token, TOKENS})
  return TOKENS.includes(token);
};

const parseFrontmatter = (content) => {
  try {
    if (content.startsWith('---')) {
      const endOfFrontmatter = content.indexOf('---', 3);
      if (endOfFrontmatter !== -1) {
        const frontmatterContent = content.substring(3, endOfFrontmatter).trim();
        const markdownContent = content.substring(endOfFrontmatter + 3).trim();
        const frontmatter = yaml.load(frontmatterContent);
        return { frontmatter, markdownContent };
      }
    }
    return { frontmatter: null, markdownContent: content };
  } catch (error) {
    console.error('Error parsing frontmatter:', error);
    return { frontmatter: null, markdownContent: content };
  }
};

const generateFileIndex = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(generateFileIndex(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const { frontmatter, markdownContent } = parseFrontmatter(content);
      const firstLine = markdownContent.split('\n')[0].replace(/^#\s*/, '');
      
      const file = {
        name: path.relative(dir, fullPath).replace(/\\/g, '/'),
        description: firstLine,
        url: `/${path.relative(PROMPTS_DIR, fullPath).replace(/\\/g, '/')}`
      };
      
      if (frontmatter && frontmatter.mcp) {
        file.mcp = frontmatter.mcp;
      }
      
      files.push(file);
    }
  });
  return files.filter(file => file);
};

app.get('/', (req, res) => {
  if (!checkAuth(req)) {
    console.log('Unauthorized access attempt to /');
    return res.status(401).send('Unauthorized');
  }
  console.log('Authorized access to /');
  const index = generateFileIndex(PROMPTS_DIR);
  res.json({ files: index });
});

app.get('/mcp/resources', (req, res) => {
  if (!checkAuth(req)) {
    console.log('Unauthorized access attempt to /mcp/resources');
    return res.status(401).send('Unauthorized');
  }
  console.log('Authorized access to /mcp/resources');
  
  const index = generateFileIndex(PROMPTS_DIR);
  const resources = index.map(file => {
    const resource = {
      name: file.name,
      description: file.description,
      type: 'prompt_template',
      url: `/mcp/resources/${file.name}`
    };
    
    if (file.mcp) {
      if (file.mcp.type) resource.type = file.mcp.type;
      if (file.mcp.name) resource.name = file.mcp.name;
      if (file.mcp.description) resource.description = file.mcp.description;
    }
    
    return resource;
  });
  
  res.json({ resources });
});

app.get('/mcp/resources/:resourcePath(*)', (req, res) => {
  if (!checkAuth(req)) {
    console.log(`Unauthorized access attempt to /mcp/resources/${req.params.resourcePath}`);
    return res.status(401).send('Unauthorized');
  }
  
  const resourcePath = req.params.resourcePath;
  const filePath = path.join(PROMPTS_DIR, resourcePath);
  
  console.log(`Authorized access to MCP resource: ${resourcePath}`);
  
  fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) {
      console.log(`Resource not found: ${resourcePath}`);
      return res.status(404).send('Resource Not Found');
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { frontmatter, markdownContent } = parseFrontmatter(content);
      
      const mcpResource = {
        content: markdownContent
      };
      
      if (frontmatter && frontmatter.mcp) {
        Object.assign(mcpResource, frontmatter.mcp);
        
        if (!mcpResource.type) {
          mcpResource.type = 'prompt_template';
        }
      }
      
      res.json(mcpResource);
    } catch (error) {
      console.error(`Error reading resource ${resourcePath}:`, error);
      res.status(500).send('Internal Server Error');
    }
  });
});

app.use(express.static(STATIC_DIR));

app.get('/favicon.ico', (req, res) => {
  const staticFaviconPath = path.join(STATIC_DIR, 'favicon.ico');
  fs.access(staticFaviconPath, fs.constants.R_OK, (err) => {
    if (!err) {
      console.log('Serving favicon from static directory');
      return res.sendFile(path.resolve(staticFaviconPath));
    }
    console.log('Favicon not found in static directory, serving fallback from root');
    res.sendFile(path.resolve('favicon.ico'));
  });
});

app.get('*', (req, res) => {
  const filePath = path.join(PROMPTS_DIR, req.path);

  if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
    if (!checkAuth(req)) {
      console.log(`Unauthorized access attempt to directory ${req.path}`);
      return res.status(401).send('Unauthorized');
    }
    console.log(`Authorized access to directory ${req.path}`);
    const index = generateFileIndex(filePath);
    return res.json({ files: index });
  }

  fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) {
      const staticFilePath = path.join(STATIC_DIR, req.path);
      fs.access(staticFilePath, fs.constants.R_OK, (staticErr) => {
        if (staticErr) {
          console.log(`File not found: ${req.path}`);
          return res.status(404).send('Not Found');
        }
        console.log(`Serving static file without auth: ${req.path}`);
        res.sendFile(path.resolve(staticFilePath));
      });
      return;
    }
    if (!checkAuth(req)) {
      console.log(`Unauthorized access attempt to ${req.path}`);
      return res.status(401).send('Unauthorized');
    }
    console.log(`Authorized access to ${req.path}`);
    res.sendFile(path.resolve(filePath));
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
