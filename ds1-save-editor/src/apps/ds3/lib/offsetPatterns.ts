import { CHARACTER_PATTERN } from './constants';

export interface OffsetPattern {
  id: string;
  label: string;
  /** Returns absolute index into getRawData() where the anchor is, or null if not found */
  findOffset(data: Uint8Array): number | null;
}

function findBytePattern(data: Uint8Array, pattern: Uint8Array): number | null {
  if (data.length < pattern.length) return null;
  const max = data.length - pattern.length;
  for (let i = 0; i <= max; i++) {
    let match = true;
    for (let j = 0; j < pattern.length; j++) {
      if (data[i + j] !== pattern[j]) { match = false; break; }
    }
    if (match) return i;
  }
  return null;
}

function findInventoryStart(data: Uint8Array): number | null {
  const GA_TABLE_OFFSET = 0x70;
  const GA_ENTRY_SMALL = 8;
  const GA_ENTRY_LARGE = 60;
  const GA_MAX_ENTRIES = 6144;

  if (data.length <= GA_TABLE_OFFSET) return null;

  // Scan GA table to find its end
  let offset = GA_TABLE_OFFSET;
  let count = 0;
  while (count < GA_MAX_ENTRIES) {
    if (offset + GA_ENTRY_SMALL > data.length) break;
    const b3 = data[offset + 3];
    if (b3 === 0x80 || b3 === 0x90 || b3 === 0xA0 || b3 === 0xB0) {
      offset += GA_ENTRY_LARGE;
    } else {
      offset += GA_ENTRY_SMALL;
    }
    count++;
  }

  const inventoryStart = offset + 0x13F + 0x1DD;
  if (inventoryStart >= data.length) return null;
  return inventoryStart;
}

export const DS3_OFFSET_PATTERNS: OffsetPattern[] = [
  {
    id: 'character_stats',
    label: 'Character Stats Pattern (FF FF FF FF 00...)',
    findOffset(data) {
      return findBytePattern(data, CHARACTER_PATTERN);
    },
  },
  {
    id: 'ga_table',
    label: 'GA Table Start (0x70)',
    findOffset(data) {
      return data.length > 0x70 ? 0x70 : null;
    },
  },
  {
    id: 'inventory',
    label: 'Inventory Start',
    findOffset(data) {
      return findInventoryStart(data);
    },
  },
];
