import express, { Router } from 'express';
import { Pool } from 'pg';

export function createWhatsAppInboxRouter(pool: Pool, auth: express.RequestHandler, emit: (organizationId: string, event: string, data: unknown) => Promise<void>): Router {
  const router = express.Router();
  router.use(auth);

  router.get('/conversations', async (req: any, res) => {
    const status = String(req.query.status ?? 'open');
    const result = await pool.query(`SELECT c.id,c.external_user_id AS "externalUserId",c.status,c.waiting_room AS "waitingRoom",c.last_message_at AS "lastMessageAt",l.id AS "leadId",l.name AS "leadName",l.phone AS "leadPhone",l.stage,l.score FROM conversations c LEFT JOIN leads l ON l.id=c.lead_id WHERE c.organization_id=$1 AND c.channel='whatsapp' AND ($2='all' OR c.status=$2) ORDER BY c.last_message_at DESC NULLS LAST`, [req.user.organizationId, status]);
    res.json(result.rows);
  });

  router.patch('/conversations/:id', async (req: any, res) => {
    const { status, waitingRoom, assignedUserId } = req.body ?? {};
    const result = await pool.query(`UPDATE conversations SET status=COALESCE($1,status),waiting_room=COALESCE($2,waiting_room),assigned_user_id=COALESCE($3,assigned_user_id),updated_at=now() WHERE id=$4 AND organization_id=$5 RETURNING id,status,waiting_room AS "waitingRoom",assigned_user_id AS "assignedUserId"`, [status ?? null, typeof waitingRoom === 'boolean' ? waitingRoom : null, assignedUserId ?? null, req.params.id, req.user.organizationId]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Conversation not found' });
    await emit(req.user.organizationId, 'conversation.updated', result.rows[0]);
    res.json(result.rows[0]);
  });

  return router;
}
