'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { diagnosticChecklistApi, type NewLinkedFindingInput } from '@/lib/diagnostic-checklist/diagnostic-checklists';
import { DIAGNOSTIC_ITEMS, type DiagnosticStatus } from '@/lib/diagnostic-checklist/catalog';
import { toast } from 'sonner';

export interface ChecklistEntry {
  id?: string;
  itemKey: string;
  status: DiagnosticStatus;
}

export interface SuggestedFinding {
  id: string;
  title: string;
  added: boolean;
  parts: Array<{
    id: string;
    partName: string;
    inventoryItemId?: string | null;
    quantity: number;
    priceAtTime: string;
    isPms: boolean;
  }>;
}

type DentMark = { x: number; y: number };

type ChecklistNotes = {
  engineType: string | null;
  transmissionType: string | null;
  dentsMarks: DentMark[];
  remarks: string;
  dentsNotes: string;
};

type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 650;

const emptyNotes = (): ChecklistNotes => ({
  engineType: null,
  transmissionType: null,
  dentsMarks: [],
  remarks: '',
  dentsNotes: '',
});

const serializeNotes = (notes: ChecklistNotes): string => JSON.stringify(notes);

export function useDiagnosticChecklist(
  appointmentId: string,
  enabled: boolean,
  readOnly = false,
) {
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [notes, setNotes] = useState<ChecklistNotes>(emptyNotes);
  const [loading, setLoading] = useState(false);
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaveStatus, setNotesSaveStatus] = useState<AutosaveStatus>('idle');
  const [notesRevision, setNotesRevision] = useState(0);
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedFinding[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const selectedKeyRef = useRef<string | null>(null);
  const suggestionsRequestId = useRef(0);
  const markingRef = useRef(false);

  /* Keep the edited snapshot synchronized immediately, even before React
     has finished rendering. A close action can flush it without waiting
     for the debounce timer or for a state render. */
  const latestNotesRef = useRef<ChecklistNotes>(emptyNotes());
  const savedNotesKeyRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);
  const loadRequestRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const closeSuggestions = useCallback(() => {
    selectedKeyRef.current = null;
    suggestionsRequestId.current += 1;
    setSelectedItemKey(null);
    setSuggestions([]);
    setSuggestionsLoading(false);
  }, []);

  const reload = useCallback(async () => {
    if (!appointmentId) return;
    const requestId = ++loadRequestRef.current;
    hydratedRef.current = false;
    setLoading(true);

    try {
      const response = await diagnosticChecklistApi.get(appointmentId);
      if (requestId !== loadRequestRef.current) return;

      const data = response.data || {};
      const saved: ChecklistNotes = {
        engineType: data.checklist?.engineType ?? null,
        transmissionType: data.checklist?.transmissionType ?? null,
        dentsMarks: Array.isArray(data.checklist?.dentsMarks) ? data.checklist.dentsMarks : [],
        remarks: data.checklist?.remarks || '',
        dentsNotes: data.checklist?.dentsNotes || '',
      };

      setEntries(Array.isArray(data.entries) ? data.entries : []);
      latestNotesRef.current = saved;
      savedNotesKeyRef.current = serializeNotes(saved);
      setNotes(saved);
      setNotesRevision(0);
      setNotesSaving(false);
      setNotesSaveStatus('saved');
      hydratedRef.current = true;
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (!enabled) {
      closeSuggestions();
      return;
    }
    void reload().catch(error => {
      console.error('[DiagnosticChecklist] Unable to load checklist:', error);
      toast.error(error?.message || 'Unable to load diagnostic checklist.');
    });
  }, [enabled, reload, closeSuggestions]);

  const statuses = useMemo(
    () => new Map(entries.map(entry => [entry.itemKey, entry.status])),
    [entries],
  );

  const totals = useMemo(() => {
    const count = { GOOD: 0, WARNING: 0, REPLACE: 0, unchecked: DIAGNOSTIC_ITEMS.length };
    for (const entry of entries) {
      if (entry.status === 'GOOD' || entry.status === 'WARNING' || entry.status === 'REPLACE') {
        count[entry.status] += 1;
      }
    }
    count.unchecked = Math.max(0, DIAGNOSTIC_ITEMS.length - entries.length);
    return count;
  }, [entries]);

  const openSuggestions = useCallback(async (itemKey: string) => {
    if (readOnly) return;
    selectedKeyRef.current = itemKey;
    setSelectedItemKey(itemKey);
    setSuggestions([]);
    setSuggestionsLoading(true);
    const requestId = ++suggestionsRequestId.current;
    try {
      const result = await diagnosticChecklistApi.suggestions(appointmentId, itemKey);
      if (requestId === suggestionsRequestId.current && selectedKeyRef.current === itemKey) {
        setSuggestions(Array.isArray(result.data) ? result.data : []);
      }
    } finally {
      if (requestId === suggestionsRequestId.current) setSuggestionsLoading(false);
    }
  }, [appointmentId, readOnly]);

  const mark = useCallback(async (itemKey: string, status: DiagnosticStatus | null) => {
    if (readOnly) throw new Error('This checklist is read-only while the job is in progress.');
    if (markingRef.current) return;
    markingRef.current = true;
    setSavingItem(itemKey);
    const oldEntries = entries;
    setEntries(current => [
      ...current.filter(entry => entry.itemKey !== itemKey),
      ...(status ? [{ itemKey, status }] : []),
    ]);
    try {
      // Good/Warning/Replace (and unchecking) are saved immediately.
      await diagnosticChecklistApi.mark(appointmentId, itemKey, status);
    } catch (error) {
      setEntries(oldEntries);
      markingRef.current = false;
      setSavingItem(null);
      throw error;
    }

    try {
      if (status === 'WARNING' || status === 'REPLACE') {
        try {
          await openSuggestions(itemKey);
        } catch (error) {
          console.error('[DiagnosticChecklist] Unable to load suggestions:', error);
          setSuggestions([]);
          throw new Error('Checklist mark saved, but suggested findings could not be loaded. Please try selecting the item again.');
        }
      } else if (selectedKeyRef.current === itemKey) {
        closeSuggestions();
      }
    } finally {
      markingRef.current = false;
      setSavingItem(null);
    }
  }, [appointmentId, entries, openSuggestions, readOnly, closeSuggestions]);

  /* ==============================================================
     SAVE ALL NOTES/VEHICLE FIELDS IN ORDER

     Serializing requests prevents an older response from overwriting
     a newer edit when the network is slow. The database endpoint
     remains the source of truth; this never changes checklist marks.
  ============================================================== */
  const flushNotes = useCallback(async () => {
    if (readOnly || !hydratedRef.current || !appointmentId) return;

    // Always chain behind the previous save, even when the currently edited
    // text matches the last SAVED text. This handles a user undoing an edit
    // while a different version is still in flight.
    const isDirty = serializeNotes(latestNotesRef.current) !== savedNotesKeyRef.current;
    if (isDirty) {
      setNotesSaving(true);
      setNotesSaveStatus('saving');
    }

    const operation = saveQueueRef.current.catch(() => undefined).then(async () => {
      const currentSnapshot = latestNotesRef.current;
      const currentKey = serializeNotes(currentSnapshot);
      if (currentKey === savedNotesKeyRef.current) return;

      await diagnosticChecklistApi.saveNotes(appointmentId, currentSnapshot);
      savedNotesKeyRef.current = currentKey;
    });

    saveQueueRef.current = operation;

    try {
      await operation;
      if (serializeNotes(latestNotesRef.current) === savedNotesKeyRef.current) {
        setNotesSaving(false);
        setNotesSaveStatus('saved');
      } else {
        // A newer edit arrived while saving the snapshot. Its own debounce
        // or the final close flush will persist the more recent version.
        setNotesSaveStatus('pending');
      }
    } catch (error) {
      setNotesSaving(false);
      setNotesSaveStatus('error');
      throw error;
    }
  }, [appointmentId, readOnly]);

  const updateNote = useCallback(<K extends keyof ChecklistNotes>(
    field: K,
    value: ChecklistNotes[K],
  ) => {
    if (readOnly || !hydratedRef.current) return;
    const updated = { ...latestNotesRef.current, [field]: value } as ChecklistNotes;
    if (serializeNotes(updated) === serializeNotes(latestNotesRef.current)) return;

    latestNotesRef.current = updated;
    setNotes(updated);
    setNotesSaving(true);
    setNotesSaveStatus('pending');
    setNotesRevision(revision => revision + 1);
  }, [readOnly]);

  /* Debounce text typing and other rapid edits. Checks are independently
     auto-saved in mark() without this delay. */
  useEffect(() => {
    if (!enabled || readOnly || !hydratedRef.current || notesRevision === 0) return;

    const timer = setTimeout(() => {
      void flushNotes().catch(error => {
        console.error('[DiagnosticChecklist] Auto-save failed:', error);
        toast.error(error?.message || 'Could not auto-save diagnostic notes. Please try again.');
      });
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [enabled, readOnly, notesRevision, flushNotes]);

  /* Retry outstanding changes when the browser comes back online. */
  useEffect(() => {
    if (!enabled || readOnly) return;
    const handleOnline = () => {
      if (serializeNotes(latestNotesRef.current) !== savedNotesKeyRef.current) {
        void flushNotes().catch(error => {
          console.error('[DiagnosticChecklist] Auto-save retry failed:', error);
        });
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [enabled, readOnly, flushNotes]);

  const setEngineType = useCallback((value: string | null) => updateNote('engineType', value), [updateNote]);
  const setTransmissionType = useCallback((value: string | null) => updateNote('transmissionType', value), [updateNote]);
  const setDentsMarks = useCallback((value: DentMark[]) => updateNote('dentsMarks', value), [updateNote]);
  const setRemarks = useCallback((value: string) => updateNote('remarks', value.slice(0, 5000)), [updateNote]);
  const setDentsNotes = useCallback((value: string) => updateNote('dentsNotes', value.slice(0, 5000)), [updateNote]);

  // Retain the previous hook API for any consumers that call saveNotes.
  // This also powers a final save before closing the checklist.
  const saveNotes = flushNotes;

  const addFinding = useCallback(async (defaultFindingId: string, itemKey?: string) => {
    if (readOnly) throw new Error('Findings cannot be added during work in progress.');
    const effectiveItemKey = itemKey || selectedKeyRef.current;
    if (!effectiveItemKey) throw new Error('Select a Warning or Replace checklist item first.');
    await diagnosticChecklistApi.addFinding(appointmentId, effectiveItemKey, defaultFindingId);
    if (selectedKeyRef.current === effectiveItemKey) {
      setSuggestions(current => current.map(finding =>
        finding.id === defaultFindingId ? { ...finding, added: true } : finding,
      ));
    }
  }, [appointmentId, readOnly]);

  const createLinkedFinding = useCallback(async (itemKey: string, input: NewLinkedFindingInput) => {
    if (readOnly) throw new Error('Findings cannot be created during work in progress.');
    const result = await diagnosticChecklistApi.createLinkedFinding(appointmentId, itemKey, input);
    const created = result.data;
    if (!created?.id) throw new Error('The new Default Finding ID was not returned.');
    if (selectedKeyRef.current === itemKey) {
      try {
        await openSuggestions(itemKey);
      } catch (refreshError) {
        console.warn('[DiagnosticChecklist] Created a linked finding, but refreshing suggestions failed:', refreshError);
      }
    }
    return { id: String(created.id), title: String(created.title || input.title), itemKey };
  }, [appointmentId, readOnly, openSuggestions]);

  return {
    entries, statuses, totals,
    engineType: notes.engineType, setEngineType,
    transmissionType: notes.transmissionType, setTransmissionType,
    dentsMarks: notes.dentsMarks, setDentsMarks,
    remarks: notes.remarks, setRemarks,
    dentsNotes: notes.dentsNotes, setDentsNotes,
    loading, savingItem, notesSaving, notesSaveStatus,
    selectedItemKey, suggestions, suggestionsLoading,
    reload, mark, saveNotes, flushNotes, openSuggestions, addFinding, createLinkedFinding,
    closeSuggestions,
  };
}
