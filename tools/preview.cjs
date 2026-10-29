// Optional local preview: node tools/preview.cjs
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const allowed = new Set(['/','/neon_breakout_arcade.html','/styles.css','/js/levels.js','/js/i18n.js','/js/game.js','/js/app.js']);
http.createServer((req,res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname); }
  catch { res.writeHead(400).end();return; }
  if (pathname === '/favicon.ico') {res.writeHead(204).end();return;}
  if (!allowed.has(pathname)) {res.writeHead(404).end('Not found');return;}
  const file = path.join(root,pathname === '/' ? 'neon_breakout_arcade.html' : pathname);
  fs.readFile(file,(error,content) => {
    if (error) {res.writeHead(404).end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'text/plain','Cache-Control':'no-store'});
    res.end(content);
  });
}).listen(4173,'127.0.0.1',() => process.stdout.write('Local: http://127.0.0.1:4173\n'));
