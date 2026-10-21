import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(process.argv[2] || '.');
const port = Number(process.env.PORT || 5173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root + sep) || !['.html', '.css', '.js', '.png', '.svg', '.ttf'].includes(extname(file))) {
      response.writeHead(404).end('Not found');
      return;
    }
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-cache' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Invoicify running at http://localhost:${port}`));
