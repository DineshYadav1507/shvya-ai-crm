import React from "react";
import { createRoot } from "react-dom/client";
import type { Activity, CallerContext, Lead } from "@shvya/shared";
import "./styles.css";

const leads: Lead[] = [
  {
    id: "lead_001",
    organizationId: "org_demo",
    name: "Rahul Sharma",
    phone: "+91 98765 43210",
    companyName: "Sharma Industries",
    status: "proposal",
    score: 87,
    source: "IndiaMART",
    lastInteractionAt: "2026-08-16T09:42:00+05:30",
    lastInteractionChannel: "whatsapp",
    createdAt: "2026-08-10T12:00:00+05:30",
  },
  {
    id: "lead_002",
    organizationId: "org_demo",
    name: "Priya Mehta",
    phone: "+91 99887 66554",
    companyName: "Mehta Retail",
    status: "qualified",
    score: 74,
    source: "Website",
    lastInteractionAt: "2026-08-15T16:15:00+05:30",
    lastInteractionChannel: "call",
    createdAt: "2026-08-11T10:25:00+05:30",
  },
];

const activities: Activity[] = [
  {
    id: "activity_001",
    organizationId: "org_demo",
    leadId: "lead_001",
    channel: "whatsapp",
    title: "Customer message",
    summary: "Sir quotation kab tak mil jayega?",
    occurredAt: "2026-08-16T09:42:00+05:30",
  },
  {
    id: "activity_002",
    organizationId: "org_demo",
    leadId: "lead_001",
    channel: "call",
    title: "Outbound call",
    summary: "Sales callback · 03:42",
    occurredAt: "2026-08-15T16:18:00+05:30",
  },
  {
    id: "activity_003",
    organizationId: "org_demo",
    leadId: "lead_001",
    channel: "email",
    title: "Quotation email",
    summary: "Revised quotation sent",
    occurredAt: "2026-08-12T14:30:00+05:30",
  },
];

const callerContext: CallerContext = {
  phone: "+91 98765 43210",
  matchedLead: leads[0],
  recentActivities: activities,
  aiBrief:
    "Rahul is in proposal stage and last asked for the revised quotation. Purchase intent looks high; confirm pricing and next decision date.",
};

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>Shvya AI</strong>
            <span>CRM</span>
          </div>
        </div>
        <nav>
          {[
            "Dashboard",
            "Leads",
            "Contacts",
            "Pipeline",
            "Inbox",
            "WhatsApp",
            "AI Agents",
            "Automations",
            "Calls",
            "Calendar",
            "Integrations",
            "Reports",
          ].map((item, index) => (
            <button className={index === 0 ? "nav-item active" : "nav-item"} key={item}>
              <span className="nav-dot" />
              {item}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">v0.1 foundation</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">Sales workspace</div>
            <h1>Good morning, Dinesh</h1>
          </div>
          <div className="top-actions">
            <button className="icon-button">⌕</button>
            <button className="icon-button">◔</button>
            <div className="avatar">DY</div>
          </div>
        </header>

        <section className="stats-grid">
          <Stat label="Total leads" value="248" delta="+18 this week" />
          <Stat label="Qualified" value="64" delta="+11 this week" />
          <Stat label="Follow-ups due" value="31" delta="9 urgent" />
          <Stat label="Pipeline value" value="₹8.4L" delta="+12.8%" />
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Recent leads</h2>
                <span>Latest activity across your sales workspace</span>
              </div>
              <button className="secondary-button">View all</button>
            </div>
            <div className="lead-list">
              {leads.map((lead) => (
                <div className="lead-row" key={lead.id}>
                  <div className="lead-avatar">{lead.name.slice(0, 2).toUpperCase()}</div>
                  <div className="lead-main">
                    <strong>{lead.name}</strong>
                    <span>{lead.companyName} · {lead.source}</span>
                  </div>
                  <div className="lead-status">
                    <span className={`pill pill-${lead.status}`}>{lead.status}</span>
                    <small>{lead.lastInteractionChannel} · {formatAge(lead.lastInteractionAt)}</small>
                  </div>
                  <div className="score">{lead.score}</div>
                </div>
              ))}
            </div>
          </div>

          <CallerPanel context={callerContext} />
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{delta}</small>
    </div>
  );
}

function CallerPanel({ context }: { context: CallerContext }) {
  const lead = context.matchedLead;
  return (
    <div className="panel caller-panel">
      <div className="call-banner"><span className="live-dot" /> Incoming call context</div>
      <div className="caller-head">
        <div className="caller-avatar">RS</div>
        <div>
          <strong>{lead?.name ?? "Unknown caller"}</strong>
          <span>{context.phone}</span>
        </div>
        {lead && <span className="existing">Existing lead</span>}
      </div>
      {lead ? (
        <>
          <div className="caller-meta">
            <div><span>Stage</span><strong>{lead.status}</strong></div>
            <div><span>Lead score</span><strong>{lead.score}/100</strong></div>
            <div><span>Last chat</span><strong>{formatAge(activities[0].occurredAt)}</strong></div>
          </div>
          <div className="ai-brief">
            <div className="ai-title">✦ AI call brief</div>
            <p>{context.aiBrief}</p>
          </div>
          <div className="timeline-mini">
            <div className="timeline-title">Recent conversation</div>
            {context.recentActivities.slice(0, 3).map((item) => (
              <div className="timeline-item" key={item.id}>
                <span className={`channel ${item.channel}`}>{item.channel.slice(0, 1).toUpperCase()}</span>
                <div><strong>{item.title}</strong><span>{item.summary}</span></div>
                <small>{formatAge(item.occurredAt)}</small>
              </div>
            ))}
          </div>
          <div className="caller-actions">
            <button className="primary-button">Open CRM</button>
            <button className="secondary-button">Open WhatsApp</button>
            <button className="secondary-button">Add note</button>
          </div>
        </>
      ) : (
        <div className="empty-caller">
          <p>This number is not in CRM.</p>
          <button className="primary-button">Create lead</button>
        </div>
      )}
    </div>
  );
}

function formatAge(value?: string) {
  if (!value) return "No activity";
  const then = new Date(value).getTime();
  const hours = Math.max(1, Math.round((Date.now() - then) / 3_600_000));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
