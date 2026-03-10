/**
 * Intangles API CORS Proxy
 * Zero dependencies — uses only Node.js built-in modules.
 *
 * Usage: node proxy-server.js
 * Then open http://localhost:3000
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_HOST = 'apis.intangles.com';

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  // --- API Proxy: /api/* → https://apis.intangles.com/* ---
  if (req.url.startsWith('/api/')) {
    const targetPath = req.url.slice(4); // strip "/api"
    const headers = { ...req.headers, host: API_HOST };
    delete headers['origin'];
    delete headers['referer'];
    delete headers['connection'];
    delete headers['accept-encoding'];
    if (req.method === 'GET') {
      delete headers['content-type'];
      delete headers['content-length'];
      delete headers['transfer-encoding'];
    }

    const proxyReq = https.request(
      { hostname: API_HOST, path: targetPath, method: req.method, headers },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          ...proxyRes.headers,
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
        });
        proxyRes.pipe(res);
      }
    );
    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
    });
    req.pipe(proxyReq);
    return;
  }

  // --- CORS preflight ---
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': '*',
      'access-control-max-age': '86400',
    });
    res.end();
    return;
  }

  // --- Static file server ---
  let filePath = req.url === '/' ? '/a2t-fms-demo.html' : req.url;
  filePath = path.join(__dirname, filePath);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Intangles Dashboard Proxy`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log(`  /api/* → https://${API_HOST}/*`);
  console.log(`  Press Ctrl+C to stop\n`);
});
