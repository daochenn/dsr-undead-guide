import { useState, useCallback } from 'react';
import { DS3SaveFileEditor } from '../lib/SaveFileEditor';
import { DS3_OFFSET_PATTERNS, OffsetPattern } from '../lib/offsetPatterns';

export interface OffsetSnapshot {
  id: string;
  /** relative offset -> byte value. Only contains entries for offsets visible at time of creation */
  data: Record<number, number>;
}

export interface OffsetSearchState {
  filePath: string | null;
  characterSlot: number;
  patternId: string;
  /** Relative offsets from pattern anchor that survived all filters */
  visibleOffsets: number[];
  snapshots: OffsetSnapshot[];
  selectedSnapshotId: string | null;
  status: string;
  isLoading: boolean;
}

const DISPLAY_LIMIT = 200;

async function readFileFromTauri(path: string): Promise<Uint8Array> {
  const fs = await import('@tauri-apps/plugin-fs');
  return fs.readFile(path);
}

async function loadCharacterData(filePath: string, slot: number): Promise<Uint8Array> {
  const raw = await readFileFromTauri(filePath);
  const blob = new Blob([raw.buffer instanceof ArrayBuffer ? raw.buffer : new Uint8Array(raw).buffer]);
  const file = new File([blob], 'save.sl2');
  const editor = await DS3SaveFileEditor.fromFile(file);
  const chars = editor.getCharacters();
  const char = chars.find(c => c.slotIndex === slot);
  if (!char) throw new Error(`Character slot ${slot} not found`);
  return char.getRawData();
}

function getPattern(patternId: string): OffsetPattern {
  const p = DS3_OFFSET_PATTERNS.find(p => p.id === patternId);
  if (!p) throw new Error(`Unknown pattern: ${patternId}`);
  return p;
}

function buildSnapshotData(
  data: Uint8Array,
  anchor: number,
  relOffsets: number[]
): Record<number, number> {
  const result: Record<number, number> = {};
  for (const rel of relOffsets) {
    const abs = anchor + rel;
    if (abs >= 0 && abs < data.length) {
      result[rel] = data[abs];
    }
  }
  return result;
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
    snapshots: [],
    selectedSnapshotId: null,
    status: 'Select a save file and press Start',
    isLoading: false,
  });

  const setStatus = (status: string) =>
    setState(s => ({ ...s, status }));

  const setFilePath = useCallback((filePath: string) =>
    setState(s => ({ ...s, filePath })), []);

  const setCharacterSlot = useCallback((slot: number) =>
    setState(s => ({ ...s, characterSlot: slot })), []);

  const setPatternId = useCallback((patternId: string) =>
    setState(s => ({ ...s, patternId })), []);

  const setSelectedSnapshotId = useCallback((id: string) =>
    setState(s => ({ ...s, selectedSnapshotId: id })), []);

  /** Create v0 — initial scan of all bytes */
  const initScan = useCallback(async () => {
    setState(s => {
      if (!s.filePath) return s;
      return { ...s, isLoading: true, status: 'Reading save file...' };
    });

    try {
      const { filePath, characterSlot, patternId } = state;
      if (!filePath) throw new Error('No file selected');

      const data = await loadCharacterData(filePath, characterSlot);
      const pattern = getPattern(patternId);
      const anchor = pattern.findOffset(data);
      if (anchor === null) throw new Error('Pattern not found in character data');

      // All relative offsets: from -(anchor) to (data.length - anchor - 1)
      const relOffsets: number[] = [];
      for (let abs = 0; abs < data.length; abs++) {
        relOffsets.push(abs - anchor);
      }

      const v0Data = buildSnapshotData(data, anchor, relOffsets);
      const v0: OffsetSnapshot = { id: 'v0', data: v0Data };

      setState(s => ({
        ...s,
        visibleOffsets: relOffsets,
        snapshots: [v0],
        selectedSnapshotId: 'v0',
        isLoading: false,
        status: `v0 created — ${relOffsets.length} offsets loaded`,
      }));
    } catch (err) {
      setState(s => ({
        ...s,
        isLoading: false,
        status: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }));
    }
  }, [state]);

  /** Filter: keep offsets where new value === selected snapshot value (no new snapshot) */
  const filterSame = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, status: 'Reading save file...' }));

    try {
      const { filePath, characterSlot, patternId, visibleOffsets, snapshots, selectedSnapshotId } = state;
      if (!filePath) throw new Error('No file selected');
      if (!selectedSnapshotId) throw new Error('No snapshot selected');
      const selected = snapshots.find(s => s.id === selectedSnapshotId);
      if (!selected) throw new Error('Selected snapshot not found');

      const data = await loadCharacterData(filePath, characterSlot);
      const pattern = getPattern(patternId);
      const anchor = pattern.findOffset(data);
      if (anchor === null) throw new Error('Pattern not found');

      const kept = visibleOffsets.filter(rel => {
        const abs = anchor + rel;
        if (abs < 0 || abs >= data.length) return false;
        return data[abs] === selected.data[rel];
      });

      setState(s => ({
        ...s,
        visibleOffsets: kept,
        isLoading: false,
        status: `Same filter applied — ${kept.length} offsets remaining`,
      }));
    } catch (err) {
      setState(s => ({
        ...s,
        isLoading: false,
        status: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }));
    }
  }, [state]);

  /** Filter: keep offsets where new value !== selected snapshot value, create new snapshot */
  const filterDifferent = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, status: 'Reading save file...' }));

    try {
      const { filePath, characterSlot, patternId, visibleOffsets, snapshots, selectedSnapshotId } = state;
      if (!filePath) throw new Error('No file selected');
      if (!selectedSnapshotId) throw new Error('No snapshot selected');
      const selected = snapshots.find(s => s.id === selectedSnapshotId);
      if (!selected) throw new Error('Selected snapshot not found');

      const data = await loadCharacterData(filePath, characterSlot);
      const pattern = getPattern(patternId);
      const anchor = pattern.findOffset(data);
      if (anchor === null) throw new Error('Pattern not found');

      const kept = visibleOffsets.filter(rel => {
        const abs = anchor + rel;
        if (abs < 0 || abs >= data.length) return false;
        return data[abs] !== selected.data[rel];
      });

      const newId = nextSnapshotId(snapshots);
      const newSnapshot: OffsetSnapshot = {
        id: newId,
        data: buildSnapshotData(data, anchor, kept),
      };

      setState(s => ({
        ...s,
        visibleOffsets: kept,
        snapshots: [...s.snapshots, newSnapshot],
        selectedSnapshotId: newId,
        isLoading: false,
        status: `${newId} created — ${kept.length} offsets remaining`,
      }));
    } catch (err) {
      setState(s => ({
        ...s,
        isLoading: false,
        status: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }));
    }
  }, [state]);

  /** Filter: keep offsets where new value differs from ALL existing snapshots, create new snapshot */
  const filterDifferentFromAll = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, status: 'Reading save file...' }));

    try {
      const { filePath, characterSlot, patternId, visibleOffsets, snapshots } = state;
      if (!filePath) throw new Error('No file selected');

      const data = await loadCharacterData(filePath, characterSlot);
      const pattern = getPattern(patternId);
      const anchor = pattern.findOffset(data);
      if (anchor === null) throw new Error('Pattern not found');

      const kept = visibleOffsets.filter(rel => {
        const abs = anchor + rel;
        if (abs < 0 || abs >= data.length) return false;
        const newByte = data[abs];
        return snapshots.every(snap => snap.data[rel] !== newByte);
      });

      const newId = nextSnapshotId(snapshots);
      const newSnapshot: OffsetSnapshot = {
        id: newId,
        data: buildSnapshotData(data, anchor, kept),
      };

      setState(s => ({
        ...s,
        visibleOffsets: kept,
        snapshots: [...s.snapshots, newSnapshot],
        selectedSnapshotId: newId,
        isLoading: false,
        status: `${newId} created — ${kept.length} offsets remaining`,
      }));
    } catch (err) {
      setState(s => ({
        ...s,
        isLoading: false,
        status: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }));
    }
  }, [state]);

  const reset = useCallback(() => {
    setState(s => ({
      ...s,
      visibleOffsets: [],
      snapshots: [],
      selectedSnapshotId: null,
      status: 'Reset. Press Start to begin new scan.',
    }));
  }, []);

  /** Export only visible offsets as CSV */
  const exportCsv = useCallback((): string => {
    const { visibleOffsets, snapshots } = state;
    const headers = ['offset', ...snapshots.map(s => s.id)].join(',');
    const rows = visibleOffsets.map(rel => {
      const offsetStr = rel < 0 ? `-0x${(-rel).toString(16).toUpperCase()}` : `0x${rel.toString(16).toUpperCase()}`;
      const vals = snapshots.map(snap => {
        const v = snap.data[rel];
        return v !== undefined ? v.toString(16).toUpperCase().padStart(2, '0') : '';
      });
      return [offsetStr, ...vals].join(',');
    });
    return [headers, ...rows].join('\n');
  }, [state]);

  /** Import CSV — restores visibleOffsets and snapshots */
  const importCsv = useCallback((csv: string) => {
    try {
      const lines = csv.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV too short');

      const headers = lines[0].split(',');
      const snapshotIds = headers.slice(1); // skip 'offset'

      const snapshots: OffsetSnapshot[] = snapshotIds.map(id => ({ id, data: {} }));
      const visibleOffsets: number[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        const offsetStr = parts[0].trim();
        let rel: number;
        if (offsetStr.startsWith('-')) {
          rel = -parseInt(offsetStr.slice(1), 16);
        } else {
          rel = parseInt(offsetStr, 16);
        }
        if (isNaN(rel)) continue;
        visibleOffsets.push(rel);

        for (let j = 0; j < snapshotIds.length; j++) {
          const valStr = parts[j + 1]?.trim();
          if (valStr) {
            snapshots[j].data[rel] = parseInt(valStr, 16);
          }
        }
      }

      setState(s => ({
        ...s,
        visibleOffsets,
        snapshots,
        selectedSnapshotId: snapshots.length > 0 ? snapshots[snapshots.length - 1].id : null,
        status: `CSV imported — ${visibleOffsets.length} offsets, ${snapshots.length} snapshots`,
      }));
    } catch (err) {
      setStatus(`Import error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

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
    initScan,
    filterSame,
    filterDifferent,
    filterDifferentFromAll,
    reset,
    exportCsv,
    importCsv,
  };
}
