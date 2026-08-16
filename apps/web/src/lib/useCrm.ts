import { useCallback, useEffect, useState } from 'react';
import { Activity, api, connectRealtime, Lead } from './api';

export function useCrm() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { setLoading(true); try { setLeads(await api.leads()); } finally { setLoading(false); } }, []);
  useEffect(() => { refresh(); return connectRealtime((message) => { if (message.event === 'lead.created') setLeads(current => [message.data as Lead, ...current]); if (message.event === 'lead.updated') setLeads(current => current.map(item => item.id === (message.data as Lead).id ? message.data as Lead : item)); if (message.event === 'activity.created' && selected && (message.data as { leadId: string }).leadId === selected.id) api.timeline(selected.id).then(setTimeline); }); }, [refresh, selected]);
  useEffect(() => { if (selected) api.timeline(selected.id).then(setTimeline); else setTimeline([]); }, [selected]);
  return { leads, selected, setSelected, timeline, loading, refresh };
}
