import 'dotenv/config';
import http from 'node:http';
import crypto from 'node:crypto';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-change-me';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface AuthRequest extends Request { user?: { id: string; organizationId: string; role: string } }
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const sign = (u: { id: string; organizationId: string; role: string }) => jwt.sign(u, JWT_SECRET, { expiresIn: '1h' });

function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const raw = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!raw) return res.status(401).json({ error: 'Missing bearer token' });
  try { req.user = jwt.verify(raw, JWT_SECRET) as AuthRequest['user']; next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

async function emit(organizationId: string, event: string, data: unknown) {
  const payload = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.readyState === 1 && client.organizationId === organizationId) client.send(payload);
  }
}

app.get('/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, service: 'shvya-api', time: new Date().toISOString() });
});

app.post('/api/auth/register', async (req, res) => {
  const { organizationName, name, email, password } = req.body ?? {};
  if (!organizationName || !name || !email || !password || password.length < 8) return res.status(400).json({ error: 'organizationName, name, email and password (8+ chars) are required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const org = await client.query('INSERT INTO organizations(name) VALUES($1) RETURNING id, name', [organizationName]);
    const hash = await bcrypt.hash(password, 12);
    const user = await client.query('INSERT INTO users(organization_id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,role,organization_id', [org.rows[0].id, name, email.toLowerCase(), hash, 'owner']);
    await client.query('COMMIT');
    const u = { id: user.rows[0].id, organizationId: user.rows[0].organization_id, role: user.rows[0].role };
    res.status(201).json({ user: user.rows[0], token: sign(u) });
  } catch (e) { await client.query('ROLLBACK'); res.status(409).json({ error: 'Unable to create account', detail: e instanceof Error ? e.message : 'unknown' }); }
  finally { client.release(); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  const result = await pool.query('SELECT id,name,email,password_hash,role,organization_id FROM users WHERE email=$1 LIMIT 1', [String(email ?? '').toLowerCase()]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password ?? '', user.password_hash))) return res.status(401).json({ error: 'Invalid email or password' });
  const u = { id: user.id, organizationId: user.organization_id, role: user.role };
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, organizationId: user.organization_id }, token: sign(u) });
});

app.get('/api/me', auth, async (req: AuthRequest, res) => {
  const result = await pool.query('SELECT id,name,email,role,organization_id AS "organizationId" FROM users WHERE id=$1 AND organization_id=$2', [req.user!.id, req.user!.organizationId]);
  res.json(result.rows[0] ?? null);
});

app.get('/api/leads', auth, async (req: AuthRequest, res) => {
  const q = String(req.query.q ?? '').trim();
  const params: unknown[] = [req.user!.organizationId];
  let where = 'organization_id=$1';
  if (q) { params.push(`%${q}%`); where += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length} OR company ILIKE $${params.length})`; }
  const result = await pool.query(`SELECT id,name,phone,email,company,source,stage,score,status,created_at AS "createdAt",updated_at AS "updatedAt" FROM leads WHERE ${where} ORDER BY updated_at DESC LIMIT 100`, params);
  res.json(result.rows);
});

app.post('/api/leads', auth, async (req: AuthRequest, res) => {
  const { name, phone, email, company, source = 'manual', stage = 'new', score = 0, ownerId } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const result = await pool.query(`INSERT INTO leads(organization_id,owner_id,name,phone,email,company,source,stage,score) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,name,phone,email,company,source,stage,score,status,created_at AS "createdAt",updated_at AS "updatedAt"`, [req.user!.organizationId, ownerId ?? req.user!.id, name, phone ?? null, email ?? null, company ?? null, source, stage, Math.max(0, Math.min(100, Number(score) || 0))]);
  const lead = result.rows[0];
  await pool.query('INSERT INTO activities(organization_id,lead_id,user_id,type,body,metadata) VALUES($1,$2,$3,$4,$5,$6)', [req.user!.organizationId, lead.id, req.user!.id, 'system', 'Lead created', JSON.stringify({ source })]);
  await emit(req.user!.organizationId, 'lead.created', lead);
  res.status(201).json(lead);
});

app.get('/api/leads/:id', auth, async (req: AuthRequest, res) => {
  const result = await pool.query(`SELECT id,name,phone,email,company,source,stage,score,status,owner_id AS "ownerId",created_at AS "createdAt",updated_at AS "updatedAt" FROM leads WHERE id=$1 AND organization_id=$2`, [req.params.id, req.user!.organizationId]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Lead not found' });
  res.json(result.rows[0]);
});

app.patch('/api/leads/:id', auth, async (req: AuthRequest, res) => {
  const allowed = ['name','phone','email','company','source','stage','score','status','owner_id'];
  const entries = Object.entries(req.body ?? {}).filter(([key]) => allowed.includes(key));
  if (!entries.length) return res.status(400).json({ error: 'No supported fields supplied' });
  const values: unknown[] = [];
  const sets = entries.map(([key, value], i) => { values.push(key === 'score' ? Math.max(0, Math.min(100, Number(value) || 0)) : value); return `${key}=$${i + 1}`; });
  values.push(req.params.id, req.user!.organizationId);
  const result = await pool.query(`UPDATE leads SET ${sets.join(',')},updated_at=now() WHERE id=$${values.length - 1} AND organization_id=$${values.length} RETURNING id,name,phone,email,company,source,stage,score,status,created_at AS "createdAt",updated_at AS "updatedAt"`, values);
  if (!result.rows[0]) return res.status(404).json({ error: 'Lead not found' });
  await emit(req.user!.organizationId, 'lead.updated', result.rows[0]);
  res.json(result.rows[0]);
});

app.get('/api/leads/:id/timeline', auth, async (req: AuthRequest, res) => {
  const result = await pool.query(`SELECT a.id,a.type,a.direction,a.body,a.metadata,a.occurred_at AS "occurredAt",u.name AS "userName" FROM activities a LEFT JOIN users u ON u.id=a.user_id WHERE a.lead_id=$1 AND a.organization_id=$2 ORDER BY a.occurred_at DESC LIMIT 200`, [req.params.id, req.user!.organizationId]);
  res.json(result.rows);
});

app.post('/api/leads/:id/activities', auth, async (req: AuthRequest, res) => {
  const { type, direction, body, metadata = {} } = req.body ?? {};
  if (!['call','whatsapp','sms','email','note','task','meeting','ai','system'].includes(type)) return res.status(400).json({ error: 'Invalid activity type' });
  const lead = await pool.query('SELECT id FROM leads WHERE id=$1 AND organization_id=$2', [req.params.id, req.user!.organizationId]);
  if (!lead.rows[0]) return res.status(404).json({ error: 'Lead not found' });
  const result = await pool.query(`INSERT INTO activities(organization_id,lead_id,user_id,type,direction,body,metadata) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,type,direction,body,metadata,occurred_at AS "occurredAt"`, [req.user!.organizationId, req.params.id, req.user!.id, type, direction ?? null, body ?? null, JSON.stringify(metadata)]);
  await pool.query('UPDATE leads SET updated_at=now() WHERE id=$1', [req.params.id]);
  await emit(req.user!.organizationId, 'activity.created', { leadId: req.params.id, activity: result.rows[0] });
  res.status(201).json(result.rows[0]);
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/realtime' });
const clients = new Set<any>();
wss.on('connection', (socket, request) => {
  const token = new URL(request.url ?? '', `http://${request.headers.host}`).searchParams.get('token');
  try {
    const user = jwt.verify(token ?? '', JWT_SECRET) as { organizationId: string };
    socket.organizationId = user.organizationId;
    clients.add(socket);
    socket.send(JSON.stringify({ event: 'connected', data: { organizationId: user.organizationId } }));
    socket.on('close', () => clients.delete(socket));
  } catch { socket.close(1008, 'Unauthorized'); }
});

server.listen(PORT, () => console.log(`Shvya API listening on http://localhost:${PORT}`));
