export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost"
  | "nurture";

export type ActivityChannel =
  | "whatsapp"
  | "call"
  | "email"
  | "sms"
  | "note"
  | "task"
  | "meeting"
  | "automation"
  | "web";

export interface Lead {
  id: string;
  organizationId: string;
  name: string;
  phone?: string;
  email?: string;
  companyName?: string;
  status: LeadStatus;
  score?: number;
  source?: string;
  lastInteractionAt?: string;
  lastInteractionChannel?: ActivityChannel;
  createdAt: string;
}

export interface Activity {
  id: string;
  organizationId: string;
  leadId: string;
  channel: ActivityChannel;
  title: string;
  summary?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface CallerContext {
  phone: string;
  matchedLead?: Lead;
  recentActivities: Activity[];
  aiBrief?: string;
}

export interface CreateLeadInput {
  name: string;
  phone?: string;
  email?: string;
  companyName?: string;
  source?: string;
  status?: LeadStatus;
}
