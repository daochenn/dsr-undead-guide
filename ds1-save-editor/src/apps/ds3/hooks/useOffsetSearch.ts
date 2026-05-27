import { useState, useCallback } from 'react';
import { DS3SaveFileEditor } from '../lib/SaveFileEditor';
import { DS3_OFFSET_PATTERNS, OffsetPattern } from '../lib/offsetPatterns';

export interface OffsetRow {
  slot: number;
  abs: number;
}

export interface OffsetSnapshot {
  id: string;
  /** "${slot}:${abs}" -> byte value */
  data: Record<string, number>;
}

export interface OffsetSearchState {
  filePath: string | null;
  /** slot index 0-9, or 'all' to scan every non-empty slot */
  characterSlot: number | 'all';
  /** pattern id from DS3_OFFSET_PATTERNS, or 'from0' for absolute-from-0 mode */
  patternId: string;
  visibleOffsets: OffsetRow[];
  /** abs anchor per slot (slot -> abs anchor); used for relative display */
  anchors: Record<number, number>;
  snapshots: OffsetSnapshot[];
  selectedSnapshotId: string | null;
  status: string;
  isLoading: boolean;
}

export const FROM0_PATTERN_ID = 'from0';
const DISPLAY_LIMIT = 200;

function rowKey(slot: number, abs: number): string {
  return `${slot}:${abs}`;
}

async function readFileFromTauri(path: string): Promise<Uint8Array> {
  const fs = await import('@tauri-apps/plugin-fs');
  return fs.readFile(path);
}

async function loadEditor(filePath: string): Promise<DS3SaveFileEditor> {
  const raw = await readFileFromTauri(filePath);
  const buf = raw.buffer instanceof ArrayBuffer ? raw.buffer : new Uint8Array(raw).buffer;
  const file = new File([new Blob([buf])], 'save.sl2');
  return DS3SaveFileEditor.fromFile(file);
}

/** Load all slots: non-empty character slots (0-9) + system entries (10+) */
async function loadAllSlots(editor: DS3SaveFileEditor): Promise<Array<{ slot: number; data: Uint8Array }>> {
  const results: Array<{ slot: number; data: Uint8Array }> = [];

  // Character slots 0-9
  for (const c of editor.getCharacters()) {
    if (!c.isEmpty) results.push({ slot: c.slotIndex, data: c.getRawData() });
  }

  // System entries (10, 11, ...)
  const total = editor.getEntryCount();
  for (let i = 10; i < total; i++) {
    try {
      const entry = await editor.getRawEntry(i);
      results.push({ slot: i, data: entry.getRawData() });
    } catch {
      // skip unreadable entries
    }
  }

  return results;
}

function getPattern(patternId: string): OffsetPattern | null {
  if (patternId === FROM0_PATTERN_ID) return null;
  return DS3_OFFSET_PATTERNS.find(p => p.id === patternId) ?? null;
}

function nextSnapshotId(snapshots: OffsetSnapshot[]): string {
  return `v${snapshots.length}`;
}

export function useOffsetSearch() {
  const [state, setState] = useState<OffsetSearchState>({
    filePath: null,
    characterSlot: 0,
    patternId: DS3_OFFSET_PATTERNS[0].id,
    visibleOffsets: [],
    anchors: {},
    snapshots: [],
    selectedSnapshotId: null,
    status: 'Select a save file and press Start',
    isLoading: false,
  });

  const setFilePath = useCallback((filePath: string) =>
    setState(s => ({ ...s, filePath })), []);

  const setCharacterSlot = useCallback((slot: number | 'all') =>
    setState(s => ({ ...s, characterSlot: slot })), []);

  const setPatternId = useCallback((patternId: string) =>
    setState(s => ({ ...s, patternId })), []);

  const setSelectedSnapshotId = useCallback((id: string) =>
    setState(s => ({ ...s, selectedSnapshotId: id })), []);

  /** Create v0 — scan based on current slot/pattern settings */
  const initScan = useCallback(async () => {
    setState(s => {
      if (!s.filePath) return s;
      return { ...s, isLoading: true, status: 'Reading save file...' };
    });

    try {
      const { filePath, characterSlot, patternId } = state;
      if (!filePath) throw new Error('No file selected');

      const editor = await loadEditor(filePath);

      // Determine which slots to scan
      let slots: Array<{ slot: number; data: Uint8Array }>;
      if (characterSlot === 'all') {
        slots = await loadAllSlots(editor);
      } else {
        const c = editor.getCharacters().find(c => c.slotIndex === characterSlot);
        if (!c) throw new Error(`Slot ${characterSlot} not found`);
        slots = [{ slot: c.slotIndex, data: c.getRawData() }];
      }

      if (slots.length === 0) throw new Error('No non-empty character slots found');

      const pattern = getPattern(patternId);

      // Compute anchor per slot
      const anchors: Record<number, number> = {};
      for (const { slot, data } of slots) {
        if (pattern === null) {
          anchors[slot] = 0;
        } else {
          const anchor = pattern.findOffset(data);
          if (anchor === null) throw new Error(`Pattern not found in slot ${slot}`);
          anchors[slot] = anchor;
        }
      }

      // Build all rows (always store abs offsets)
      const allRows: OffsetRow[] = [];
      const v0Data: Record<string, number> = {};
      for (const { slot, data } of slots) {
        for (let abs = 0; abs < data.length; abs++) {
          allRows.push({ slot, abs });
          v0Data[rowKey(slot, abs)] = data[abs];
        }
      }

      const v0: OffsetSnapshot = { id: 'v0', data: v0Data };

      setState(s => ({
        ...s,
        visibleOffsets: allRows,
        anchors,
        snapshots: [v0],
        selectedSnapshotId: 'v0',
        isLoading: false,
        status: `v0 created — ${allRows.length.toLocaleString()} offsets across ${slots.length} slot(s)`,
      }));
    } catch (err) {
      setState(s => ({
        ...s,
        isLoading: false,
        status: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }));
    }
  }, [state]);

  /** Build slotMap for all slots referenced in visibleOffsets */
  const buildSlotMap = async (
    filePath: string,
    visibleOffsets: OffsetRow[]
  ): Promise<Map<number, Uint8Array>> => {
    const editor = await loadEditor(filePath);
    const neededSlots = new Set(visibleOffsets.map(r => r.slot));
    const map = new Map<number, Uint8Array>();

    for (const c of editor.getCharacters()) {
      if (neededSlots.has(c.slotIndex)) map.set(c.slotIndex, c.getRawData());
    }
    // System entries (10+)
    const total = editor.getEntryCount();
    for (let i = 10; i < total; i++) {
      if (neededSlots.has(i)) {
        try { map.set(i, (await editor.getRawEntry(i)).getRawData()); } catch { /* skip */ }
      }
    }
    return map;
  };

  /** Filter: keep rows where current value === selected snapshot value */
  const filterSame = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, status: 'Reading save file...' }));
    try {
      const { filePath, visibleOffsets, snapshots, selectedSnapshotId } = state;
      if (!filePath) throw new Error('No file selected');
      const selected = snapshots.find(s => s.id === selectedSnapshotId);
      if (!selected) throw new Error('No snapshot selected');

      const slotMap = await buildSlotMap(filePath, visibleOffsets);
      const kept = visibleOffsets.filter(({ slot, abs }) => {
        const data = slotMap.get(slot);
        if (!data || abs >= data.length) return false;
        return data[abs] === selected.data[rowKey(slot, abs)];
      });

      setState(s => ({
        ...s, visibleOffsets: kept, isLoading: false,
        status: `Same filter applied — ${kept.length.toLocaleString()} offsets remaining`,
      }));
    } catch (err) {
      setState(s => ({ ...s, isLoading: false, status: `Error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  }, [state]);

  /** Filter: keep rows where current value !== selected snapshot value, create new snapshot */
  const filterDifferent = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, status: 'Reading save file...' }));
    try {
      const { filePath, visibleOffsets, snapshots, selectedSnapshotId } = state;
      if (!filePath) throw new Error('No file selected');
      const selected = snapshots.find(s => s.id === selectedSnapshotId);
      if (!selected) throw new Error('No snapshot selected');

      const slotMap = await buildSlotMap(filePath, visibleOffsets);
      const kept = visibleOffsets.filter(({ slot, abs }) => {
        const data = slotMap.get(slot);
        if (!data || abs >= data.length) return false;
        return data[abs] !== selected.data[rowKey(slot, abs)];
      });

      const newId = nextSnapshotId(snapshots);
      const newData: Record<string, number> = {};
      for (const { slot, abs } of kept) {
        const data = slotMap.get(slot);
        if (data && abs < data.length) newData[rowKey(slot, abs)] = data[abs];
      }

      setState(s => ({
        ...s, visibleOffsets: kept,
        snapshots: [...s.snapshots, { id: newId, data: newData }],
        selectedSnapshotId: newId, isLoading: false,
        status: `${newId} created — ${kept.length.toLocaleString()} offsets remaining`,
      }));
    } catch (err) {
      setState(s => ({ ...s, isLoading: false, status: `Error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  }, [state]);

  /** Filter: keep rows where current value differs from ALL existing snapshots, create new snapshot */
  const filterDifferentFromAll = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, status: 'Reading save file...' }));
    try {
      const { filePath, visibleOffsets, snapshots } = state;
      if (!filePath) throw new Error('No file selected');

      const slotMap = await buildSlotMap(filePath, visibleOffsets);
      const kept = visibleOffsets.filter(({ slot, abs }) => {
        const data = slotMap.get(slot);
        if (!data || abs >= data.length) return false;
        const newByte = data[abs];
        const key = rowKey(slot, abs);
        return snapshots.every(snap => snap.data[key] !== newByte);
      });

      const newId = nextSnapshotId(snapshots);
      const newData: Record<string, number> = {};
      for (const { slot, abs } of kept) {
        const data = slotMap.get(slot);
        if (data && abs < data.length) newData[rowKey(slot, abs)] = data[abs];
      }

      setState(s => ({
        ...s, visibleOffsets: kept,
        snapshots: [...s.snapshots, { id: newId, data: newData }],
        selectedSnapshotId: newId, isLoading: false,
        status: `${newId} created — ${kept.length.toLocaleString()} offsets remaining`,
      }));
    } catch (err) {
      setState(s => ({ ...s, isLoading: false, status: `Error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  }, [state]);

  const reset = useCallback(() => {
    setState(s => ({
      ...s,
      visibleOffsets: [],
      anchors: {},
      snapshots: [],
      selectedSnapshotId: null,
      status: 'Reset. Press Start to begin new scan.',
    }));
  }, []);

  const exportCsv = useCallback((): string => {
    const { visibleOffsets, snapshots, anchors, patternId } = state;
    const isAbsolute = patternId === FROM0_PATTERN_ID;
    const headers = ['slot', 'offset', ...snapshots.map(s => s.id)].join(',');
    const rows = visibleOffsets.map(({ slot, abs }) => {
      const key = rowKey(slot, abs);
      const anchor = anchors[slot] ?? 0;
      const rel = abs - anchor;
      const offsetStr = isAbsolute
        ? `0x${abs.toString(16).toUpperCase()}`
        : (rel < 0 ? `-0x${(-rel).toString(16).toUpperCase()}` : `0x${rel.toString(16).toUpperCase()}`);
      const vals = snapshots.map(snap => {
        const v = snap.data[key];
        return v !== undefined ? v.toString(16).toUpperCase().padStart(2, '0') : '';
      });
      return [slot, offsetStr, ...vals].join(',');
    });
    return [headers, ...rows].join('\n');
  }, [state]);

  const importCsv = useCallback((csv: string) => {
    try {
      const lines = csv.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV too short');
      const headers = lines[0].split(',');
      const snapshotIds = headers.slice(2);
      const snapshots: OffsetSnapshot[] = snapshotIds.map(id => ({ id, data: {} }));
      const visibleOffsets: OffsetRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        const slot = parseInt(parts[0].trim(), 10);
        const offsetStr = parts[1].trim();
        let abs: number;
        if (offsetStr.startsWith('-')) {
          abs = -parseInt(offsetStr.slice(1), 16);
        } else {
          abs = parseInt(offsetStr, 16);
        }
        if (isNaN(slot) || isNaN(abs)) continue;
        visibleOffsets.push({ slot, abs });
        const key = rowKey(slot, abs);
        for (let j = 0; j < snapshotIds.length; j++) {
          const valStr = parts[j + 2]?.trim();
          if (valStr) snapshots[j].data[key] = parseInt(valStr, 16);
        }
      }

      setState(s => ({
        ...s,
        visibleOffsets,
        snapshots,
        selectedSnapshotId: snapshots.length > 0 ? snapshots[snapshots.length - 1].id : null,
        status: `CSV imported — ${visibleOffsets.length.toLocaleString()} offsets, ${snapshots.length} snapshots`,
      }));
    } catch (err) {
      setState(s => ({ ...s, status: `Import error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  }, []);

  /** Format offset for display based on current mode */
  const formatOffset = useCallback((slot: number, abs: number): string => {
    const { patternId, anchors } = state;
    if (patternId === FROM0_PATTERN_ID) {
      return `0x${abs.toString(16).toUpperCase()}`;
    }
    const anchor = anchors[slot] ?? 0;
    const rel = abs - anchor;
    return rel < 0
      ? `-0x${(-rel).toString(16).toUpperCase()}`
      : `0x${rel.toString(16).toUpperCase()}`;
  }, [state]);

  const displayedOffsets = state.visibleOffsets.slice(0, DISPLAY_LIMIT);

  return {
    state,
    displayedOffsets,
    totalOffsets: state.visibleOffsets.length,
    DISPLAY_LIMIT,
    setFilePath,
    setCharacterSlot,
    setPatternId,
    setSelectedSnapshotId,
    formatOffset,
    initScan,
    filterSame,
    filterDifferent,
    filterDifferentFromAll,
    reset,
    exportCsv,
    importCsv,
  };
}
