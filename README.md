# Shvya AI CRM

Shvya AI is a multi-tenant AI CRM foundation for leads, conversations, omnichannel communication, automation, AI agents, calling, scheduling, and integrations.

## Initial architecture

- `apps/web` — React + TypeScript CRM UI
- `apps/api` — Node.js API foundation
- `packages/shared` — shared domain types/contracts
- `docs` — architecture and implementation notes

## Product direction

The platform is designed around:

- Leads, contacts, companies, pipelines and activities
- Unified customer timeline across WhatsApp, calls, email, notes and tasks
- WhatsApp Cloud API integration
- AI lead qualification and follow-up
- Workflow/sequence automation
- Scheduling and reminders
- IndiaMART, Google Sheets, webhooks and other lead sources
- Mobile call-context experience for recognizing callers and creating leads
- Multi-tenant organizations, users and role-based access

This repository currently contains the initial foundation only. Provider credentials and production infrastructure are intentionally not hard-coded.
