import crypto from 'node:crypto';
import type { Request, Response, Router } from 'express';
import express from 'express';
import { Pool } from 'pg';

export function createWhatsAppRouter(pool: Pool, emit: (organizationId: string, event: string, data: unknown) => Promise<void>): Router {
  const router = express.Router();

  router.get('/webhook', (req: Request, res: Response) => {
    const mode = String(req.query['hub.mode'] ?? '');
    const token = String(req.query['hub.verify_token'] ?? '');
    const challenge = String(req.query['hub.challenge'] ?? '');
    if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.sendStatus(403);
  });

  router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
    const signature = req.header('x-hub-signature-256');
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (appSecret && signature) {
      const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(raw).digest('hex')}`;
      if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.sendStatus(401);
    }

    let payload: any;
    try { payload = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
    res.sendStatus(200);

    try {
      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field !== 'messages') continue;
          const value = change.value ?? {};
          const phoneNumberId = value.metadata?.phone_number_id;
          const account = await pool.query('SELECT organization_id FROM whatsapp_connections WHERE phone_number_id=$1 AND status=$2 LIMIT 1', [phoneNumberId, 'connected']);
          const organizationId = account.rows[0]?.organization_id;
          if (!organizationId) continue;
          for (const message of value.messages ?? []) {
            if (message.type !== 'text') continue;
            const phone = String(message.from ?? '');
            const text = String(message.text?.body ?? '');
            const leadResult = await pool.query(`SELECT id,name,phone,stage,score,status FROM leads WHERE organization_id=$1 AND regexp_replace(phone,'\\D','','g') = regexp_replace($2,'\\D','','g') LIMIT 1`, [organizationId, phone]);
            const lead = leadResult.rows[0];
            const activity = await pool.query(`INSERT INTO activities(organization_id,lead_id,type,direction,body,metadata) VALUES($1,$2,'whatsapp','inbound',$3,$4) RETURNING id,type,direction,body,metadata,occurred_at AS "occurredAt"`, [organizationId, lead?.id ?? null, text, JSON.stringify({ provider: 'whatsapp_cloud_api', messageId: message.id, phone, timestamp: message.timestamp })]);
            await emit(organizationId, 'whatsapp.message.received', { lead, phone, text, activity: activity.rows[0] });
            if (lead) await emit(organizationId, 'lead.context.updated', { leadId: lead.id, phone, lastChatAt: activity.rows[0].occurredAt, lastMessage: text });
          }
        }
      }
    } catch (error) { console.error('WhatsApp webhook processing failed', error); }
  });

  return router;
}
