'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { diagnosticChecklistApi } from '@/lib/diagnostic-checklist/diagnostic-checklists';
import { DIAGNOSTIC_ITEMS, type DiagnosticStatus } from '@/lib/diagnostic-checklist/catalog';

export interface ChecklistEntry { id?: string; itemKey: string; status: DiagnosticStatus; }
export interface SuggestedFinding { id: string; title: string; added: boolean; parts: Array<{
  id: string; partName: string; quantity: number; priceAtTime: string; isPms: boolean;
}>; }

export function useDiagnosticChecklist(appointmentId: string, enabled: boolean) {
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [engineType, setEngineType] = useState<string | null>(null);
  const [transmissionType, setTransmissionType] = useState<string | null>(null);
  const [timeOut, setTimeOut] = useState<string | null>(null);
  const [dentsMarks, setDentsMarks] = useState<Array<{x:number;y:number}>>([]);
  const [remarks, setRemarks] = useState('');
  const [dentsNotes, setDentsNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [notesSaving, setNotesSaving] = useState(false);
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedFinding[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    try {
      const res = await diagnosticChecklistApi.get(appointmentId);
      const data = res.data || {};
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setEngineType(data.checklist?.engineType ?? null);
      setTransmissionType(data.checklist?.transmissionType ?? null);
      setTimeOut(data.checklist?.timeOut ?? null);
      setDentsMarks(Array.isArray(data.checklist?.dentsMarks) ? data.checklist.dentsMarks : []);
      setRemarks(data.checklist?.remarks || '');
      setDentsNotes(data.checklist?.dentsNotes || '');
    } finally { setLoading(false); }
  }, [appointmentId]);

  useEffect(() => { if (!enabled) return; void reload().catch(console.error); }, [enabled, reload]);

  const statuses = useMemo(() => new Map(entries.map(entry => [entry.itemKey, entry.status])), [entries]);
  const totals = useMemo(() => {
    const count = { GOOD: 0, WARNING: 0, REPLACE: 0, unchecked: DIAGNOSTIC_ITEMS.length };
    for (const row of entries) { if (row.status in count) count[row.status] += 1; }
    count.unchecked = Math.max(0, DIAGNOSTIC_ITEMS.length - entries.length);
    return count;
  }, [entries]);

  const openSuggestions = useCallback(async (itemKey: string) => {
    setSelectedItemKey(itemKey);
    setSuggestions([]);
    setSuggestionsLoading(true);
    try {
      const result = await diagnosticChecklistApi.suggestions(appointmentId, itemKey);
      setSuggestions(Array.isArray(result.data) ? result.data : []);
    } finally { setSuggestionsLoading(false); }
  }, [appointmentId]);

  const mark = useCallback(async (itemKey: string, status: DiagnosticStatus | null) => {
    if (savingItem) return;
    const oldEntries = entries;
    setSavingItem(itemKey);
    setEntries(current => [
      ...current.filter(entry => entry.itemKey !== itemKey),
      ...(status ? [{ itemKey, status }] : []),
    ]);
    try {
      await diagnosticChecklistApi.mark(appointmentId, itemKey, status);
      if (status === 'WARNING' || status === 'REPLACE') await openSuggestions(itemKey);
      else if (selectedItemKey === itemKey) setSelectedItemKey(null);
    } catch (error) {
      setEntries(oldEntries);
      throw error;
    } finally { setSavingItem(null); }
  }, [appointmentId, entries, openSuggestions, savingItem, selectedItemKey]);

  const saveNotes = useCallback(async () => {
    setNotesSaving(true);
    try { await diagnosticChecklistApi.saveNotes(appointmentId, { remarks, dentsNotes, engineType, transmissionType, timeOut, dentsMarks }); }
    finally { setNotesSaving(false); }
  }, [appointmentId, remarks, dentsNotes, engineType, transmissionType, timeOut, dentsMarks]);

  const addFinding = useCallback(async (defaultFindingId: string) => {
    if (!selectedItemKey) return;
    await diagnosticChecklistApi.addFinding(appointmentId, selectedItemKey, defaultFindingId);
    setSuggestions(old => old.map(item => item.id === defaultFindingId ? { ...item, added: true } : item));
  }, [appointmentId, selectedItemKey]);

  return {
    entries, statuses, totals, engineType, setEngineType, transmissionType, setTransmissionType, timeOut, setTimeOut, dentsMarks, setDentsMarks, remarks, setRemarks, dentsNotes, setDentsNotes,
    loading, savingItem, notesSaving, selectedItemKey, suggestions, suggestionsLoading,
    reload, mark, saveNotes, openSuggestions, addFinding,
    closeSuggestions: () => setSelectedItemKey(null),
  };
}
