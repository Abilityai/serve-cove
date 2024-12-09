require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');

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

const generateFileIndex = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(generateFileIndex(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const firstLine = content.split('\n')[0].replace(/^#\s*/, '');
      files.push({
        name: path.relative(dir, fullPath).replace(/\\/g, '/'),
        description: firstLine,
        url: `/${path.relative(PROMPTS_DIR, fullPath).replace(/\\/g, '/')}`
      });
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

  // Check if path is a directory
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
      // Check if the file exists in the static dir, serve without auth if it does
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
    // Authorization required for main prompt files
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
