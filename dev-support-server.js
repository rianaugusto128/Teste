const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, 'petshop', 'src', 'main', 'resources', 'static');
const dbFile = path.join(__dirname, 'petshop', 'target', 'support-dev-db.json');
const port = Number(process.env.PORT || 8080);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function now() {
  return new Date().toISOString();
}

function readDb() {
  try {
    return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  } catch (_) {
    return { nextTicketId: 1, nextMessageId: 1, tickets: [], messages: [] };
  }
}

function writeDb(db) {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (_) {
        resolve({});
      }
    });
  });
}

function addMessage(db, ticketId, autorTipo, autorNome, mensagem) {
  const msg = {
    id: db.nextMessageId++,
    ticketId: Number(ticketId),
    autorTipo: autorTipo || 'SISTEMA',
    autorNome: autorNome || autorTipo || 'Sistema',
    mensagem: String(mensagem || '').trim(),
    criadoEm: now(),
  };
  db.messages.push(msg);
  return msg;
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  if (url.pathname === '/api/suporte/health') return sendJson(res, 200, { ok: true, mensagem: 'Suporte online' });

  const db = readDb();

  if (url.pathname === '/api/suporte/stats' && req.method === 'GET') {
    return sendJson(res, 200, {
      abertos: db.tickets.filter((t) => t.status === 'ABERTO').length,
      fechados: db.tickets.filter((t) => t.status === 'FECHADO').length,
      total: db.tickets.length,
    });
  }

  if (url.pathname === '/api/suporte/tickets' && req.method === 'GET') {
    const status = url.searchParams.get('status');
    const tickets = db.tickets
      .filter((t) => !status || t.status === status)
      .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    return sendJson(res, 200, tickets);
  }

  if (url.pathname === '/api/suporte/tickets' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body.nome || !body.email || !body.mensagem) {
      return sendJson(res, 400, { mensagem: 'Preencha nome, e-mail e mensagem.' });
    }

    const ticket = {
      id: db.nextTicketId++,
      nome: String(body.nome).trim(),
      email: String(body.email).trim().toLowerCase(),
      assunto: String(body.assunto || 'Suporte PetZilla').trim(),
      status: 'ABERTO',
      criadoEm: now(),
      atualizadoEm: now(),
      fechadoEm: null,
    };
    db.tickets.push(ticket);
    addMessage(db, ticket.id, 'CLIENTE', ticket.nome, body.mensagem);
    writeDb(db);
    return sendJson(res, 200, ticket);
  }

  const ticketMatch = url.pathname.match(/^\/api\/suporte\/tickets\/(\d+)$/);
  if (ticketMatch && req.method === 'GET') {
    const ticket = db.tickets.find((t) => t.id === Number(ticketMatch[1]));
    return ticket ? sendJson(res, 200, ticket) : sendJson(res, 404, { mensagem: 'Ticket nao encontrado.' });
  }

  const messagesMatch = url.pathname.match(/^\/api\/suporte\/tickets\/(\d+)\/mensagens$/);
  if (messagesMatch && req.method === 'GET') {
    const ticketId = Number(messagesMatch[1]);
    const ticket = db.tickets.find((t) => t.id === ticketId);
    if (!ticket) return sendJson(res, 404, { mensagem: 'Ticket nao encontrado.' });
    return sendJson(res, 200, db.messages.filter((m) => m.ticketId === ticketId));
  }

  if (messagesMatch && req.method === 'POST') {
    const ticketId = Number(messagesMatch[1]);
    const ticket = db.tickets.find((t) => t.id === ticketId);
    if (!ticket) return sendJson(res, 404, { mensagem: 'Ticket nao encontrado.' });
    if (ticket.status === 'FECHADO') return sendJson(res, 400, { mensagem: 'Ticket ja esta fechado.' });

    const body = await readBody(req);
    if (!body.mensagem) return sendJson(res, 400, { mensagem: 'Informe a mensagem.' });
    const msg = addMessage(db, ticketId, body.autorTipo, body.autorNome, body.mensagem);
    ticket.atualizadoEm = now();
    writeDb(db);
    return sendJson(res, 200, msg);
  }

  const closeMatch = url.pathname.match(/^\/api\/suporte\/tickets\/(\d+)\/fechar$/);
  if (closeMatch && req.method === 'POST') {
    const ticket = db.tickets.find((t) => t.id === Number(closeMatch[1]));
    if (!ticket) return sendJson(res, 404, { mensagem: 'Ticket nao encontrado.' });
    ticket.status = 'FECHADO';
    ticket.fechadoEm = now();
    ticket.atualizadoEm = now();
    writeDb(db);
    return sendJson(res, 200, ticket);
  }

  return sendJson(res, 404, { mensagem: 'Rota nao encontrada.' });
}

function serveStatic(req, res, url) {
  let filePath = decodeURIComponent(url.pathname);
  if (filePath === '/') filePath = '/index.html';
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  const absolute = path.resolve(root, filePath.replace(/^[/\\]+/, ''));

  if (!absolute.toLowerCase().startsWith(root.toLowerCase())) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(absolute, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Arquivo nao encontrado.');
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(absolute)] || 'application/octet-stream' });
    res.end(data);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/suporte')) return handleApi(req, res, url);
  return serveStatic(req, res, url);
}).listen(port, () => {
  console.log(`PetZilla suporte local rodando em http://localhost:${port}`);
});
