import { DS3Character } from './Character';
import { COVENANT_BADGE_INVENTORY } from './constants';

/**
 * DS3 Item Infusion Types
 * Based on the Final.py analysis
 */
export enum ItemInfusion {
  Standard = 0,
  Heavy = 1,
  Sharp = 2,
  Refined = 3,
  Simple = 4,
  Crystal = 5,
  Fire = 6,
  Chaos = 7,
  Lightning = 8,
  Deep = 9,
  Dark = 10,
  Poison = 11,
  Blood = 12,
  Raw = 13,
  Blessed = 14,
  Hollow = 15,
}

/**
 * Item Category based on separator byte (byte 3)
 * Based on analysis from find-inventory-end.js
 */
export enum ItemCategory {
  Weapons = 0x80,      // Weapons (separator 0x80 in structures)
  Armor = 0x90,        // Armor (separator 0x90)
  Rings = 0xA0,        // Rings (separator 0xA0)
  Consumables = 0xB0,  // Goods/Consumables (separator 0xB0)
}

export enum ItemCollectionType {
  Weapon = 'Weapon',
  Ring = 'Ring',
  Armor = 'Armor',
  Consumable = 'Consumable',
  Magic = 'Magic',
  Ore = 'Ore',
  Key = 'Key',
  Ammunition = 'Ammunition',
  Covenant = 'Covenant',
  Unknown = 'Unknown',
}

export interface Item {
  Type: string;
  Id: string;
  MaxStackCount: number;
  Category: string;
  Name: string;
  MaxUpgrade?: number;
  CanInfuse?: boolean;
  Durability?: number;
}

export interface ItemsDatabase {
  weapon_items?: Item[];
  armor_items?: Item[];
  ring_items?: Item[];
  magic_items?: Item[];
  consumable_items?: Item[];
  ore_items?: Item[];
  key_items?: Item[];
  ammunition_items?: Item[];
  covenant_items?: Item[];
}

/**
 * DS3 Inventory Item
 * Structure: 16 bytes per item (based on Final.py and analysis)
 *
 * Bytes 0-2: Prefix/Unknown
 * Byte 3: Separator (0x80=Weapons, 0x90=Armor, 0xA0=Rings, 0xB0=Consumables)
 * Bytes 4-7: Item ID (4 bytes, little-endian)
 * Byte 8: Quantity (1 byte) OR
 * Bytes 8-10: Quantity (3 bytes for stackable items)
 * Bytes 11-15: Unknown/Additional data
 */
// Module-level WeakMap: same ItemsDatabase object → same pre-built lookup Map.
// Built once per DB load, reused across all DS3InventoryItem instances.
// covenant_items first so covenant badges win over duplicate ring_items entries.
const _dbItemMaps = new WeakMap<ItemsDatabase, Map<number, Item>>();
function _getDbItemMap(db: ItemsDatabase): Map<number, Item> {
  let map = _dbItemMaps.get(db);
  if (map) return map;
  map = new Map<number, Item>();
  const arrays = [
    db.covenant_items, db.weapon_items, db.ring_items, db.armor_items,
    db.consumable_items, db.magic_items, db.ore_items, db.key_items, db.ammunition_items,
  ];
  for (const arr of arrays) {
    if (!arr) continue;
    for (const item of arr) {
      const id = parseInt(item.Id.replace('0x', '').replace('0X', ''), 16);
      if (!map.has(id)) map.set(id, item); // first writer wins
    }
  }
  _dbItemMaps.set(db, map);
  return map;
}

export class DS3InventoryItem {
  private data: Uint8Array;
  private itemsDatabase: ItemsDatabase | null;
  public slotIndex: number;

  private _cachedBaseItemId: number | null = null;

  constructor(data: Uint8Array, slotIndex: number, itemsDatabase: ItemsDatabase | null = null) {
    this.data = new Uint8Array(16);
    if (data) {
      this.data.set(data.slice(0, 16));
    }
    this.slotIndex = slotIndex;
    this.itemsDatabase = itemsDatabase;
  }

  /**
   * Separator byte (byte 3) - indicates item category
   */
  get separator(): number {
    return this.data[3];
  }

  set separator(value: number) {
    this.data[3] = value & 0xFF;
  }

  /**
   * Item ID (bytes 4-7, little-endian)
   */
  get itemId(): number {
    return (
      this.data[4] |
      (this.data[5] << 8) |
      (this.data[6] << 16) |
      (this.data[7] << 24)
    ) >>> 0; // Unsigned 32-bit
  }

  set itemId(value: number) {
    this.data[4] = value & 0xFF;
    this.data[5] = (value >> 8) & 0xFF;
    this.data[6] = (value >> 16) & 0xFF;
    this.data[7] = (value >> 24) & 0xFF;
  }

  /**
   * Quantity (bytes 8-11, little-endian uint32)
   */
  get quantity(): number {
    return (this.data[8] | (this.data[9] << 8) | (this.data[10] << 16) | (this.data[11] << 24)) >>> 0;
  }

  set quantity(value: number) {
    this.data[8]  = value & 0xFF;
    this.data[9]  = (value >> 8) & 0xFF;
    this.data[10] = (value >> 16) & 0xFF;
    this.data[11] = (value >> 24) & 0xFF;
  }

  /**
   * Bytes 0-2: First 3 bytes of item ID (for signature)
   * These should match bytes 4-6
   */
  updateItemIdPrefix(): void {
    this.data[0] = this.data[4];
    this.data[1] = this.data[5];
    this.data[2] = this.data[6];
  }

  /**
   * Signature bytes 12-13 (counters)
   * Based on Final.py logic
   */
  get counterByte12(): number {
    return this.data[12];
  }

  set counterByte12(value: number) {
    this.data[12] = value & 0xFF;
  }

  get counterByte13(): number {
    return this.data[13];
  }

  set counterByte13(value: number) {
    this.data[13] = value & 0xFF;
  }

  /**
   * Set signature bytes (9-15) based on previous item or defaults
   * Bytes 9-11: 00 00 00
   * Byte 12: counter (incremented from previous)
   * Byte 13: counter with masking
   * Bytes 14-15: copied from previous or default
   */
  setSignatureBytes(previousItem: DS3InventoryItem | null): void {
    // Bytes 9-11: always 00 00 00
    this.data[9] = 0x00;
    this.data[10] = 0x00;
    this.data[11] = 0x00;

    if (previousItem && !previousItem.isEmpty) {
      // Copy and increment counter from previous item
      const prevCounter12 = previousItem.counterByte12;
      const prevCounter13 = previousItem.counterByte13;

      // Increment byte 12
      const newCounter12 = (prevCounter12 + 1) & 0xFF;
      this.data[12] = newCounter12;

      // Byte 13: increment lower nibble (0-9 decimal value)
      const lowerNibble = prevCounter13 & 0x0F;
      const upperNibble = prevCounter13 & 0xF0;
      const newLowerNibble = ((lowerNibble + 1) % 10) & 0x0F;
      this.data[13] = upperNibble | newLowerNibble;

      // Copy bytes 14-15 from previous item
      this.data[14] = previousItem.data[14];
      this.data[15] = previousItem.data[15];
    } else {
      // Default values (from Final.py default_pattern)
      this.data[12] = 0x90;
      this.data[13] = 0xA0;
      this.data[14] = 0xEE;
      this.data[15] = 0x02;
    }
  }

  /**
   * Check if slot is empty.
   * An empty slot has byte[3] == 0x00 (upper nibble of gaitem_handle = ITEM_TYPE_EMPTY).
   */
  get isEmpty(): boolean {
    return this.data[3] === 0x00;
  }

  /**
   * Get upgrade level for weapons (0-15)
   * Formula: byte0 = base_byte0 + (infusion * 100) + upgrade
   * So: upgrade = (byte0 - base_byte0) % 100
   */
  get upgradeLevel(): number {
    // Only weapons have upgrade levels (separator 0x80)
    if (this.separator !== 0x80 || !this.itemsDatabase) {
      return 0;
    }

    const baseId = this.baseItemId;
    if (baseId === this.itemId) {
      return 0; // No upgrade/infusion
    }

    const low16 = this.itemId & 0xFFFF;
    const baseLow16 = baseId & 0xFFFF;
    const modifier = (low16 - baseLow16 + 0x10000) & 0xFFFF;

    return modifier % 100;
  }

  /**
   * Get infusion type for weapons
   * Formula: low16 = base_low16 + (infusion * 100) + upgrade
   * So: infusion = floor((low16 - base_low16) / 100)
   */
  get infusion(): ItemInfusion {
    // Only weapons have infusions (separator 0x80)
    if (this.separator !== 0x80 || !this.itemsDatabase) {
      return ItemInfusion.Standard;
    }

    const baseId = this.baseItemId;
    if (baseId === this.itemId) {
      return ItemInfusion.Standard; // No upgrade/infusion
    }

    const low16 = this.itemId & 0xFFFF;
    const baseLow16 = baseId & 0xFFFF;
    const modifier = (low16 - baseLow16 + 0x10000) & 0xFFFF;

    return Math.floor(modifier / 100) as ItemInfusion;
  }

  /**
   * Get base item ID (without upgrade modifiers)
   * Formula: byte0 = base_byte0 + (infusion * 100) + upgrade
   *
   * For weapons, bytes 1-3 stay the same, only byte0 changes with upgrades/infusions.
   * So we search for a weapon with matching bytes 1-3 in the database.
   */
  get baseItemId(): number {
    // Only weapons need ID cleaning (separator 0x80)
    if (this.separator !== 0x80 || !this.itemsDatabase) {
      return this.itemId;
    }

    // Use cached value if available
    if (this._cachedBaseItemId !== null) {
      return this._cachedBaseItemId;
    }

    const allWeapons = this.itemsDatabase.weapon_items || [];
    const high16 = (this.itemId >>> 16) & 0xFFFF;
    const low16 = this.itemId & 0xFFFF;

    // Search for weapon where upper 16 bits match and modifier (low16 diff) is within valid range (0-1510)
    // Weapons in same category are spaced ~10000 apart so modifier <= 1510 uniquely identifies the base weapon
    const found = allWeapons.find(w => {
      const dbId = this.parseHex(w.Id);
      if (((dbId >>> 16) & 0xFFFF) !== high16) return false;
      const modifier = (low16 - (dbId & 0xFFFF) + 0x10000) & 0xFFFF;
      return modifier <= 1510;
    });

    const result = found ? this.parseHex(found.Id) : this.itemId;
    this._cachedBaseItemId = result;
    return result;
  }

  /**
   * Get item info from database — O(1) via module-level WeakMap lookup
   */
  get itemInfo(): Item | null {
    if (this.isEmpty || !this.itemsDatabase) return null;
    const map = _getDbItemMap(this.itemsDatabase);
    return map.get(this.baseItemId) ?? map.get(this.itemId) ?? null;
  }

  /**
   * Get item name
   */
  get itemName(): string {
    const info = this.itemInfo;
    if (!info) {
      return `Unknown (ID:0x${this.itemId.toString(16).toUpperCase()}, Sep:0x${this.separator.toString(16).toUpperCase()})`;
    }
    return info.Name;
  }

  /**
   * Get collection type — O(1) via category string on the looked-up item
   */
  get collectionType(): ItemCollectionType {
    const info = this.itemInfo;
    if (!info) return ItemCollectionType.Unknown;

    const category = info.Category?.toLowerCase();
    if (category === 'keys') return ItemCollectionType.Key;
    if (category === 'covenants') return ItemCollectionType.Covenant;
    if (category === 'ores') return ItemCollectionType.Ore;
    if (category === 'ammunition') return ItemCollectionType.Ammunition;
    if (category === 'rings') return ItemCollectionType.Ring;
    if (category === 'sorceries' || category === 'miracles' || category === 'pyromancies') return ItemCollectionType.Magic;
    if (category === 'helms' || category === 'chests' || category === 'gauntlets' || category === 'leggings') return ItemCollectionType.Armor;

    // Fallback for weapon/consumable/etc. categories not explicitly listed above
    const db = this.itemsDatabase;
    if (db?.weapon_items?.includes(info)) return ItemCollectionType.Weapon;
    if (db?.consumable_items?.includes(info)) return ItemCollectionType.Consumable;
    if (db?.magic_items?.includes(info)) return ItemCollectionType.Magic;
    if (db?.ammunition_items?.includes(info)) return ItemCollectionType.Ammunition;

    return ItemCollectionType.Unknown;
  }

  private parseHex(hex: string): number {
    return parseInt(hex.replace('0x', '').replace('0X', ''), 16);
  }

  getRawData(): Uint8Array {
    return new Uint8Array(this.data);
  }
}

/**
 * DS3 Inventory Manager
 * Based on analysis from find-inventory-*.js scripts
 */
export class DS3Inventory {
  private character: DS3Character;
  private itemsDatabase: ItemsDatabase | null = null;

  private static readonly ITEM_SIZE = 16;
  // Key items live in a separate section immediately after the regular inventory
  private static readonly REGULAR_SLOTS = 1920;          // max regular inventory slots
  private static readonly KEY_SECTION_OFFSET = 0x7800;  // byte offset from invStart to key-count field
  private static readonly MAX_KEY_SLOTS = 256;
  private static readonly KEY_SLOT_BASE = 3000;          // virtual slot index for key section

  constructor(character: DS3Character) {
    this.character = character;
  }

  /**
   * Load items database from JSON
   */
  async loadItemsDatabase(): Promise<void> {
    const isElectron = typeof window !== 'undefined' && window.location.protocol === 'file:';

    const paths = isElectron
      ? ['./json/ds3_items.json', '/json/ds3_items.json']
      : ['/json/ds3_items.json', './json/ds3_items.json'];

    let lastError: Error | null = null;

    for (const jsonPath of paths) {
      try {
        const response = await fetch(jsonPath);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        this.itemsDatabase = await response.json();
        console.log('[DS3 Inventory] Items database loaded successfully');
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Failed to load DS3 items database from ${jsonPath}:`, lastError);
      }
    }

    console.error('Could not load DS3 items database from any path:', lastError);
    throw new Error('Could not load DS3 items database. Please ensure ds3_items.json is available.');
  }

  getItemsDatabase(): ItemsDatabase | null {
    return this.itemsDatabase;
  }

  /**
   * Get inventory start offset.
   *
   * Same algorithm as the Python reference (main_ds3.py):
   *   gaEnd = walk GA table from 0x70 (6144 entries; weapon/armor = 60 bytes, rest = 8 bytes)
   *   inventoryStart = gaEnd + 0x13F + 0x1DD
   *
   * IMPORTANT: type-bit comparisons must use unsigned (>>> 0) because JS
   * bitwise ops produce signed 32-bit integers; without >>> 0 the comparison
   * 0x80000000 === tp silently fails for every weapon/armor entry.
   */
  private static readonly GA_START        = 0x70;
  private static readonly GA_SLOTS        = 6144;
  private static readonly GA_ENTRY_SMALL  = 8;
  private static readonly GA_ENTRY_LARGE  = 60;   // weapon / armor
  private static readonly GA_TYPE_WEAPON  = 0x80000000 >>> 0;
  private static readonly GA_TYPE_ARMOR   = 0x90000000 >>> 0;
  private static readonly INV_OFFSET_FROM_GA_END = 0x13F + 0x1DD; // 0x31C

  private scanGATable(data: Uint8Array, slots: number = DS3Inventory.GA_SLOTS): {
    items: Array<{ handle: number; itemId: number; offset: number }>;
    empty: Array<{ handle: number; itemId: number; offset: number }>;
    endOffset: number;
  } {
    const items: Array<{ handle: number; itemId: number; offset: number }> = [];
    const empty: Array<{ handle: number; itemId: number; offset: number }> = [];
    let off = DS3Inventory.GA_START;

    for (let i = 0; i < slots; i++) {
      if (off + DS3Inventory.GA_ENTRY_SMALL > data.length) break;
      const gh = ((data[off] | (data[off + 1] << 8) | (data[off + 2] << 16) | (data[off + 3] << 24)) >>> 0);
      const iid = ((data[off + 4] | (data[off + 5] << 8) | (data[off + 6] << 16) | (data[off + 7] << 24)) >>> 0);
      const tp = (gh & 0xF0000000) >>> 0;
      const entry = { handle: gh, itemId: iid, offset: off };
      items.push(entry);
      if (gh === 0) {
        empty.push(entry);
        off += DS3Inventory.GA_ENTRY_SMALL;
      } else if (tp === DS3Inventory.GA_TYPE_WEAPON || tp === DS3Inventory.GA_TYPE_ARMOR) {
        off += DS3Inventory.GA_ENTRY_LARGE;
      } else {
        off += DS3Inventory.GA_ENTRY_SMALL;
      }
    }
    return { items, empty, endOffset: off };
  }

  private gaTableEnd(data: Uint8Array): number {
    return this.scanGATable(data).endOffset;
  }

  /**
   * Writes a 60-byte GA table entry for a weapon or armor item.
   * Ports the Python add_weapon_armor GA logic:
   *   1. Insert 60-byte entry at first empty slot (+60 bytes)
   *   2. Delete the next earliest empty 8-byte slot (-8 bytes, net +52)
   *   3. Delete 52 bytes from near the end to maintain file size (net 0)
   * Returns ga_highest index (used in inventory slot bytes 0-1), or 0 on failure.
   */
  private addGAEntry(
    finalItemId: number,
    collectionType: ItemCollectionType,
    durability: number
  ): number {
    const data = this.character.getRawData();
    const { items, empty } = this.scanGATable(data);

    if (empty.length < 5) {
      console.warn('[DS3 GA] Not enough empty GA slots');
      return 0;
    }

    // ga_highest = max(handle & 0x0000FFFF across all non-empty items) + 1
    let maxIdx = 0;
    for (const it of items) {
      if (it.handle !== 0) {
        const idx = it.handle & 0x0000FFFF;
        if (idx > maxIdx) maxIdx = idx;
      }
    }
    const gaHighest = (maxIdx + 1) & 0xFFFF;

    // First empty slot (minimum offset)
    const gaEmptyOff = empty.reduce((m, e) => (e.offset < m ? e.offset : m), empty[0].offset);

    // Build 60-byte GA entry (based on Python templates)
    const gaSlot = new Uint8Array(60);
    gaSlot[0] = gaHighest & 0xFF;
    gaSlot[1] = (gaHighest >> 8) & 0xFF;
    if (collectionType === ItemCollectionType.Weapon) {
      gaSlot[2] = 0x80; gaSlot[3] = 0x80;
    } else {
      gaSlot[2] = 0x81; gaSlot[3] = 0x90;
    }
    gaSlot[4] = finalItemId & 0xFF;
    gaSlot[5] = (finalItemId >> 8) & 0xFF;
    gaSlot[6] = (finalItemId >> 16) & 0xFF;
    gaSlot[7] = (finalItemId >> 24) & 0xFF;
    // bytes 8-11: durability (uint32 LE)
    gaSlot[8]  = durability & 0xFF;
    gaSlot[9]  = (durability >> 8) & 0xFF;
    gaSlot[10] = (durability >> 16) & 0xFF;
    gaSlot[11] = (durability >> 24) & 0xFF;
    // byte 16: 0x01 (from Python template)
    gaSlot[16] = 0x01;
    // 0x80 sentinels at bytes 23, 31, 39, 47, 55 (from Python template)
    gaSlot[23] = 0x80; gaSlot[31] = 0x80; gaSlot[39] = 0x80;
    gaSlot[47] = 0x80; gaSlot[55] = 0x80;

    const origLen = data.length;

    // Step 1: insert 60 bytes at gaEmptyOff → data grows by 60
    const step1 = new Uint8Array(origLen + 60);
    step1.set(data.slice(0, gaEmptyOff));
    step1.set(gaSlot, gaEmptyOff);
    step1.set(data.slice(gaEmptyOff), gaEmptyOff + 60);

    // Step 2: re-scan with 6145 slots, delete earliest empty 8-byte entry → net +52
    const { empty: empty2 } = this.scanGATable(step1, 6145);
    if (empty2.length < 1) {
      console.warn('[DS3 GA] No empty slot found after insertion');
      return 0;
    }
    const gaDelOff = empty2.reduce((m, e) => (e.offset < m ? e.offset : m), empty2[0].offset);
    const step2 = new Uint8Array(origLen + 52);
    step2.set(step1.slice(0, gaDelOff));
    step2.set(step1.slice(gaDelOff + 8), gaDelOff);

    // Step 3: delete 52 bytes from near end (keep last 13 bytes) → net 0
    const END_CUTOFF = 0x0D;
    const delStart = step2.length - 52 - END_CUTOFF;
    if (delStart < 0) {
      console.warn('[DS3 GA] Cannot trim end: delStart < 0');
      return 0;
    }
    const finalBuf = new Uint8Array(origLen);
    finalBuf.set(step2.slice(0, delStart));
    finalBuf.set(step2.slice(delStart + 52), delStart);

    data.set(finalBuf);
    // GA manipulation shifts bytes in the buffer → invalidate cached pattern offset
    // so stat reads after this use the correct (shifted) position
    this.character.invalidatePatternCache();
    console.log(`[DS3 GA] Entry written for itemId=0x${finalItemId.toString(16)} gaHighest=${gaHighest}`);
    return gaHighest;
  }

  private getInventoryStartOffset(): number {
    const data = this.character.getRawData();
    const gaEnd = this.gaTableEnd(data);
    const start = gaEnd + DS3Inventory.INV_OFFSET_FROM_GA_END;
    console.log(`[DS3 Inventory] ga_end=0x${gaEnd.toString(16)} inventory_start=0x${start.toString(16)}`);
    return start;
  }

  /** Byte offset in data[] for a given virtual slot index */
  private getSlotOffset(slotIndex: number): number {
    const invStart = this.getInventoryStartOffset();
    if (slotIndex >= DS3Inventory.KEY_SLOT_BASE) {
      const keyIdx = slotIndex - DS3Inventory.KEY_SLOT_BASE;
      return invStart + DS3Inventory.KEY_SECTION_OFFSET + 4 + keyIdx * DS3Inventory.ITEM_SIZE;
    }
    return invStart + slotIndex * DS3Inventory.ITEM_SIZE;
  }

  private getKeyItemCount(data: Uint8Array): number {
    const invStart = this.getInventoryStartOffset();
    const off = invStart + DS3Inventory.KEY_SECTION_OFFSET;
    if (off + 4 > data.length) return 0;
    return (data[off] | (data[off+1]<<8) | (data[off+2]<<16) | (data[off+3]<<24)) >>> 0;
  }

  private setKeyItemCount(data: Uint8Array, count: number): void {
    const invStart = this.getInventoryStartOffset();
    const off = invStart + DS3Inventory.KEY_SECTION_OFFSET;
    data[off]   = count & 0xFF;
    data[off+1] = (count >> 8) & 0xFF;
    data[off+2] = (count >> 16) & 0xFF;
    data[off+3] = (count >> 24) & 0xFF;
  }

  /**
   * Find character pattern in data (used for stat offsets)
   */
  private findPattern(data: Uint8Array): number {
    const pattern = [
      0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ];

    if (data.length < pattern.length) {
      return -1;
    }

    const maxStart = data.length - pattern.length;

    for (let i = 0; i <= maxStart; i++) {
      let found = true;
      for (let j = 0; j < pattern.length; j++) {
        if (data[i + j] !== pattern[j]) {
          found = false;
          break;
        }
      }
      if (found) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Calculate CRC16 for item ID (used in bytes 14-15)
   * This appears to be CRC16-CCITT (polynomial 0x1021)
   */
  // @ts-expect-error - Reserved for future use
  private _calculateItemCRC16(itemId: number): number {
    const bytes = [
      itemId & 0xFF,
      (itemId >> 8) & 0xFF,
      (itemId >> 16) & 0xFF,
      (itemId >> 24) & 0xFF,
    ];

    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (const byte of bytes) {
      crc ^= (byte << 8);
      for (let i = 0; i < 8; i++) {
        if (crc & 0x8000) {
          crc = ((crc << 1) ^ polynomial) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }

    return crc & 0xFFFF;
  }

  /**
   * Read Counter 1 (Pattern + 472)
   * Counter 1 is the global item counter used in bytes 0-1 of each item
   */
  // @ts-expect-error - Reserved for future use
  private _readCounter1(): number {
    const data = this.character.getRawData();
    const patternOffset = this.findPattern(data);

    if (patternOffset === -1) {
      throw new Error('[DS3 Inventory] Character pattern not found');
    }

    const counter1Offset = patternOffset + 472;

    if (counter1Offset + 1 >= data.length) {
      throw new Error('[DS3 Inventory] Counter 1 offset out of bounds');
    }

    // Read counter (2 bytes, little-endian)
    return data[counter1Offset] | (data[counter1Offset + 1] << 8);
  }

  /**
   * Increment Counter 1 (Pattern + 472)
   * Counter 1 tracks inventory item additions (including deleted items)
   * Based on Final.py logic: both counters increment together
   */
  // @ts-expect-error - Disabled: offsets unverified, caused stat corruption
  private incrementCounter1(): void {
    const data = this.character.getRawData();
    const patternOffset = this.findPattern(data);

    if (patternOffset === -1) {
      throw new Error('[DS3 Inventory] Character pattern not found');
    }

    // Counter 1 is at Pattern + 472 (Final.py pattern is 1 byte before ours, so 473 - 1 = 472)
    const counter1Offset = patternOffset + 472;

    if (counter1Offset + 1 >= data.length) {
      throw new Error('[DS3 Inventory] Counter 1 offset out of bounds');
    }

    // Read counter (2 bytes, little-endian)
    const counter1Value = data[counter1Offset] | (data[counter1Offset + 1] << 8);

    // Increment with wrap-around at 0xFFFF
    const newCounter1Value = (counter1Value + 1) & 0xFFFF;

    // Write back (little-endian)
    data[counter1Offset] = newCounter1Value & 0xFF;
    data[counter1Offset + 1] = (newCounter1Value >> 8) & 0xFF;
  }

  /**
   * Read Counter 2 (Pattern + 35300)
   * Counter 2 is used in bytes 14-15 of each item
   */
  // @ts-expect-error - Reserved for future use
  private _readCounter2(): number {
    const data = this.character.getRawData();
    const patternOffset = this.findPattern(data);

    if (patternOffset === -1) {
      throw new Error('[DS3 Inventory] Character pattern not found');
    }

    const counter2Offset = patternOffset + 35300;

    if (counter2Offset + 1 >= data.length) {
      throw new Error('[DS3 Inventory] Counter 2 offset out of bounds');
    }

    // Read counter (2 bytes, little-endian)
    return data[counter2Offset] | (data[counter2Offset + 1] << 8);
  }

  /**
   * Update Counter 2 (Pattern + 35300) to max(current, newIndex).
   * The game rejects items whose index exceeds counter2 by more than ~10.
   * Always increase, never decrease — safe to call after every addItem.
   */
  private updateCounter2(newIndex: number): void {
    const data = this.character.getRawData();
    const patternOffset = this.findPattern(data);
    if (patternOffset === -1) return;

    const counter2Offset = patternOffset + 35300;
    if (counter2Offset + 1 >= data.length) return;

    const current = (data[counter2Offset] | (data[counter2Offset + 1] << 8)) >>> 0;
    if (newIndex <= current) return;

    data[counter2Offset]     = newIndex & 0xFF;
    data[counter2Offset + 1] = (newIndex >> 8) & 0xFF;
    console.log(`[DS3 Inventory] counter2 updated: 0x${current.toString(16)} → 0x${newIndex.toString(16)}`);
  }

  /**
   * Get all non-empty items from inventory (regular + key section)
   */
  getAllItems(): DS3InventoryItem[] {
    const items: DS3InventoryItem[] = [];
    const data = this.character.getRawData();
    const inventoryStart = this.getInventoryStartOffset();

    // Regular inventory (slots 0 … REGULAR_SLOTS-1)
    for (let i = 0; i < DS3Inventory.REGULAR_SLOTS; i++) {
      const offset = inventoryStart + i * DS3Inventory.ITEM_SIZE;
      if (offset + DS3Inventory.ITEM_SIZE > data.length) break;
      const item = new DS3InventoryItem(data.slice(offset, offset + DS3Inventory.ITEM_SIZE), i, this.itemsDatabase);
      if (!item.isEmpty) items.push(item);
    }

    // Key items section (separate area at KEY_SECTION_OFFSET)
    const keyCount = Math.min(this.getKeyItemCount(data), DS3Inventory.MAX_KEY_SLOTS);
    for (let i = 0; i < keyCount; i++) {
      const offset = inventoryStart + DS3Inventory.KEY_SECTION_OFFSET + 4 + i * DS3Inventory.ITEM_SIZE;
      if (offset + DS3Inventory.ITEM_SIZE > data.length) break;
      const item = new DS3InventoryItem(data.slice(offset, offset + DS3Inventory.ITEM_SIZE), DS3Inventory.KEY_SLOT_BASE + i, this.itemsDatabase);
      if (!item.isEmpty) items.push(item);
    }

    return items;
  }

  /**
   * Get items by collection type
   */
  getItemsByType(collectionType: ItemCollectionType): DS3InventoryItem[] {
    return this.getAllItems().filter((item) => item.collectionType === collectionType);
  }

  /**
   * Read item from specific slot (regular or key section)
   */
  readSlot(slotIndex: number): DS3InventoryItem {
    const data = this.character.getRawData();
    const offset = this.getSlotOffset(slotIndex);
    if (offset < 0 || offset + DS3Inventory.ITEM_SIZE > data.length) {
      throw new Error('Slot index out of range');
    }
    return new DS3InventoryItem(data.slice(offset, offset + DS3Inventory.ITEM_SIZE), slotIndex, this.itemsDatabase);
  }

  /**
   * Write item to specific slot (regular or key section)
   */
  writeSlot(slotIndex: number, item: DS3InventoryItem): void {
    const data = this.character.getRawData();
    const offset = this.getSlotOffset(slotIndex);
    if (offset < 0 || offset + DS3Inventory.ITEM_SIZE > data.length) {
      throw new Error('Slot index out of range');
    }
    data.set(item.getRawData(), offset);
  }

  /**
   * Find next available slot (2 consecutive empty slots) in the regular inventory
   */
  findNextAvailableSlot(): number {
    for (let i = 0; i < DS3Inventory.REGULAR_SLOTS - 1; i++) {
      const slot = this.readSlot(i);
      const nextSlot = this.readSlot(i + 1);
      if (slot.isEmpty && nextSlot.isEmpty) return i;
    }
    return 0; // Fallback to slot 0
  }

  /**
   * Find existing item in inventory (regular + key section)
   */
  findExistingItem(itemInfo: Item): DS3InventoryItem | null {
    const baseId = this.parseHex(itemInfo.Id);
    for (const item of this.getAllItems()) {
      if (!item.isEmpty && item.baseItemId === baseId) return item;
    }
    return null;
  }

  /**
   * Add item to inventory
   * For weapons: applies formula byte0 = base_byte0 + (infusion * 100) + upgrade
   * Items are added to the first empty slot found or to the specified targetSlot
   * @param targetSlot - Optional slot index to add the item to. If not specified, finds first empty slot.
   */
  addItem(itemInfo: Item, quantity: number = 1, upgradeLevel: number = 0, infusion: number = 0, targetSlot?: number): number | null {
    const collectionType = this.getCollectionTypeFromItem(itemInfo);

    // For stackable items, check if item already exists
    if (
      collectionType !== ItemCollectionType.Weapon &&
      collectionType !== ItemCollectionType.Armor &&
      collectionType !== ItemCollectionType.Ring &&
      itemInfo.MaxStackCount > 1
    ) {
      const existing = this.findExistingItem(itemInfo);
      if (existing) {
        const newQuantity = Math.min(existing.quantity + quantity, itemInfo.MaxStackCount);
        existing.quantity = newQuantity;
        this.writeSlot(existing.slotIndex, existing);
        return existing.slotIndex;
      }
    }

    // Key items always go into the key section regardless of targetSlot
    if (collectionType === ItemCollectionType.Key) {
      return this.addKeyItem(itemInfo);
    }

    // Determine insert index
    let insertIndex = -1;
    // @ts-expect-error - Reserved for future use
    let _previousNonEmptyItem: DS3InventoryItem | null = null;

    if (targetSlot !== undefined) {
      insertIndex = targetSlot;
      if (insertIndex < 0 || insertIndex >= DS3Inventory.REGULAR_SLOTS) {
        console.warn(`[DS3 Inventory] Invalid target slot ${targetSlot}`);
        return null;
      }
      for (let j = insertIndex - 1; j >= 0; j--) {
        const prevSlot = this.readSlot(j);
        if (!prevSlot.isEmpty) { _previousNonEmptyItem = prevSlot; break; }
      }
    } else {
      // Find 2 consecutive empty slots in the regular inventory
      for (let i = 0; i < DS3Inventory.REGULAR_SLOTS - 1; i++) {
        const slot = this.readSlot(i);
        const nextSlot = this.readSlot(i + 1);
        if (slot.isEmpty && nextSlot.isEmpty) {
          insertIndex = i;
          for (let j = i - 1; j >= 0; j--) {
            const prevSlot = this.readSlot(j);
            if (!prevSlot.isEmpty) { _previousNonEmptyItem = prevSlot; break; }
          }
          break;
        }
      }
      if (insertIndex === -1) {
        console.warn('[DS3 Inventory] Could not find 2 consecutive empty slots');
        return null;
      }
    }

    // @ts-expect-error - Reserved for future use
    const _slot = this.readSlot(insertIndex);
    let finalItemId = this.parseHex(itemInfo.Id);

    // For weapons, apply upgrade and infusion to lower 16 bits
    // Formula: low16 = base_low16 + (infusion * 100) + upgrade
    if (collectionType === ItemCollectionType.Weapon && (upgradeLevel > 0 || infusion > 0)) {
      const low16 = finalItemId & 0xFFFF;
      const high16 = (finalItemId >>> 16) & 0xFFFF;
      const modifier = (infusion * 100) + upgradeLevel;
      const newLow16 = (low16 + modifier) & 0xFFFF;
      finalItemId = ((high16 << 16) | newLow16) >>> 0;
    }

    // Determine separator based on category
    // Covenant badges have 0x2000XXXX IDs (ring type) → use 0xA0, not 0xB0
    let separator = 0xB0; // Default: Consumables/Goods
    if (collectionType === ItemCollectionType.Weapon) separator = 0x80;
    else if (collectionType === ItemCollectionType.Armor) separator = 0x90;
    else if (collectionType === ItemCollectionType.Ring || collectionType === ItemCollectionType.Covenant) separator = 0xA0;

    // For weapons/armor, write GA entry first (modifies raw data; inventory offset shifts after)
    let gaHighest = 0;
    if (collectionType === ItemCollectionType.Weapon || collectionType === ItemCollectionType.Armor) {
      const durability = itemInfo.Durability ?? (collectionType === ItemCollectionType.Weapon ? 75 : 360);
      gaHighest = this.addGAEntry(finalItemId, collectionType, durability);
    }

    // Create new item data from scratch
    const newItemData = new Uint8Array(16);

    // Bytes 4-7: Item ID (little-endian) - write this first
    newItemData[4] = finalItemId & 0xFF;
    newItemData[5] = (finalItemId >> 8) & 0xFF;
    newItemData[6] = (finalItemId >> 16) & 0xFF;
    newItemData[7] = (finalItemId >> 24) & 0xFF;

    // Bytes 0-2 + 3: depends on type
    if (collectionType === ItemCollectionType.Weapon || collectionType === ItemCollectionType.Armor) {
      // Bytes 0-1: gaHighest (GA table index), byte 2: 0x80
      newItemData[0] = gaHighest & 0xFF;
      newItemData[1] = (gaHighest >> 8) & 0xFF;
      newItemData[2] = 0x80;
      newItemData[3] = separator;
    } else {
      // Bytes 0-2: Copy first 3 bytes of Item ID (bytes 4-6)
      newItemData[0] = newItemData[4];
      newItemData[1] = newItemData[5];
      newItemData[2] = newItemData[6];
      newItemData[3] = separator;
    }

    // Bytes 8-11: Quantity (uint32, little-endian)
    const clampedQty = Math.min(quantity, itemInfo.MaxStackCount);
    newItemData[8]  = clampedQty & 0xFF;
    newItemData[9]  = (clampedQty >> 8) & 0xFF;
    newItemData[10] = (clampedQty >> 16) & 0xFF;
    newItemData[11] = (clampedQty >> 24) & 0xFF;

    // Find highest existing index across all items (regular + covenant inventory)
    let highestIndex = 0;
    for (const item of this.getAllItems()) {
      const raw = item.getRawData();
      const indexValue = raw[12] | ((raw[13] & 0x0F) << 8);
      if (indexValue > highestIndex) highestIndex = indexValue;
    }
    const newIndex = highestIndex + 1;
    newItemData[12] = newIndex & 0xFF;

    // Covenant badges require item-specific byte13_upper and bytes14-15 (game validates them).
    // All other types use a random upper nibble for byte13, which the game does not validate.
    if (collectionType === ItemCollectionType.Covenant) {
      const badgeBytes = COVENANT_BADGE_INVENTORY[finalItemId];
      const upper = badgeBytes ? badgeBytes.byte13_upper : 0x4; // fallback: 0x4
      newItemData[13] = ((upper & 0xF) << 4) | ((newIndex >> 8) & 0x0F);
      newItemData[14] = badgeBytes ? badgeBytes.byte14 : 0x77;
      newItemData[15] = badgeBytes ? badgeBytes.byte15 : 0x02;
    } else {
      const randomByte = Math.floor(Math.random() * 256);
      newItemData[13] = (randomByte & 0xF0) | ((newIndex >> 8) & 0x0F);
      // Bytes 14-15: type-specific constants from game templates
      if (separator === 0x80) {        // Weapon
        newItemData[14] = 0x18; newItemData[15] = 0xFB;
      } else if (separator === 0x90) { // Armor
        newItemData[14] = 0x65; newItemData[15] = 0xFE;
      } else {                         // Rings / Goods
        newItemData[14] = 0xCF; newItemData[15] = 0x1F;
      }
    }

    console.log(`[DS3 Add Item] Adding ${itemInfo.Name} to slot ${insertIndex}`);
    console.log(`  Item ID: 0x${finalItemId.toString(16).toUpperCase()}`);
    console.log(`  Full bytes: ${Array.from(newItemData).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}`);

    // Write the new item
    const newItem = new DS3InventoryItem(newItemData, insertIndex, this.itemsDatabase);
    this.writeSlot(insertIndex, newItem);

    // Keep counter2 (pattern+35300) >= newIndex so the game accepts the item on load.
    this.updateCounter2(newIndex);

    return insertIndex;
  }

  private getStorageBoxStart(data: Uint8Array): number {
    try {
      const inventoryStart = this.getInventoryStartOffset();
      if (inventoryStart < 0 || inventoryStart >= data.length) return -1;

      const inventoryEnd = inventoryStart + 0x8808;
      const aboveStorageCounter = inventoryEnd + 0x11C;
      if (aboveStorageCounter + 4 > data.length) return -1;

      const aboveStorageSize = (
        data[aboveStorageCounter] |
        (data[aboveStorageCounter + 1] << 8) |
        (data[aboveStorageCounter + 2] << 16) |
        (data[aboveStorageCounter + 3] << 24)
      ) >>> 0;

      // Sanity check: a value over 10000 almost certainly means the offset is wrong
      if (aboveStorageSize > 10000) {
        console.warn(`[DS3 Storage] aboveStorageSize=${aboveStorageSize} looks invalid, skipping storage`);
        return -1;
      }

      const table1End = aboveStorageCounter + 4 + (aboveStorageSize * 8);
      if (table1End >= data.length) return -1;

      const faceDataMaybe = table1End + 0x18C;
      const storageStart = faceDataMaybe + 0x4;

      if (storageStart < 0 || storageStart + DS3Inventory.ITEM_SIZE > data.length) return -1;

      return storageStart;
    } catch {
      return -1;
    }
  }

  getAllStorageItems(): DS3InventoryItem[] {
    const items: DS3InventoryItem[] = [];
    const data = this.character.getRawData();
    const storageStart = this.getStorageBoxStart(data);
    if (storageStart < 0 || storageStart + DS3Inventory.ITEM_SIZE > data.length) return items;
    const maxSlots = Math.floor(Math.min(0x7800, data.length - storageStart) / DS3Inventory.ITEM_SIZE);
    for (let i = 0; i < maxSlots; i++) {
      const offset = storageStart + i * DS3Inventory.ITEM_SIZE;
      if (offset + DS3Inventory.ITEM_SIZE > data.length) break;
      const item = new DS3InventoryItem(data.slice(offset, offset + DS3Inventory.ITEM_SIZE), i, this.itemsDatabase);
      if (!item.isEmpty) items.push(item);
    }
    return items;
  }

  getStorageItemsByType(collectionType: ItemCollectionType): DS3InventoryItem[] {
    return this.getAllStorageItems().filter(item => item.collectionType === collectionType);
  }

  getStorageQuantity(baseItemId: number): number {
    try {
      return this.getAllStorageItems()
        .filter(item => item.baseItemId === baseItemId)
        .reduce((sum, item) => sum + item.quantity, 0);
    } catch {
      return 0;
    }
  }

  /**
   * Set (or create) a storage box entry for a stackable item.
   * Finds existing slot and updates quantity, or writes to first empty slot.
   * Returns true on success, false if storage offset is unavailable.
   */
  setStorageQuantity(itemInfo: Item, quantity: number): boolean {
    try {
      const data = this.character.getRawData();
      const storageStart = this.getStorageBoxStart(data);
      if (storageStart < 0) return false;

      const clampedQty = Math.min(600, Math.max(0, quantity));
      const baseId = this.parseHex(itemInfo.Id);
      const maxSlots = Math.floor(Math.min(0x7800, data.length - storageStart) / DS3Inventory.ITEM_SIZE);

      // Try to find existing slot for this item
      for (let i = 0; i < maxSlots; i++) {
        const offset = storageStart + i * DS3Inventory.ITEM_SIZE;
        if (offset + DS3Inventory.ITEM_SIZE > data.length) break;
        const item = new DS3InventoryItem(data.slice(offset, offset + DS3Inventory.ITEM_SIZE), i, this.itemsDatabase);
        if (!item.isEmpty && item.baseItemId === baseId) {
          if (clampedQty === 0) {
            // Remove from storage
            data.fill(0x00, offset, offset + DS3Inventory.ITEM_SIZE);
          } else {
            data[offset + 8]  = clampedQty & 0xFF;
            data[offset + 9]  = (clampedQty >> 8) & 0xFF;
            data[offset + 10] = (clampedQty >> 16) & 0xFF;
            data[offset + 11] = (clampedQty >> 24) & 0xFF;
          }
          return true;
        }
      }

      if (clampedQty === 0) return true; // Nothing to add

      // Item not in storage — find first empty slot
      const collectionType = this.getCollectionTypeFromItem(itemInfo);
      let separator = 0xB0;
      if (collectionType === ItemCollectionType.Ring) separator = 0xA0;

      for (let i = 0; i < maxSlots; i++) {
        const offset = storageStart + i * DS3Inventory.ITEM_SIZE;
        if (offset + DS3Inventory.ITEM_SIZE > data.length) break;
        const slot = new DS3InventoryItem(data.slice(offset, offset + DS3Inventory.ITEM_SIZE), i, this.itemsDatabase);
        if (slot.isEmpty) {
          const newSlot = new Uint8Array(16);
          newSlot[0] = baseId & 0xFF;
          newSlot[1] = (baseId >> 8) & 0xFF;
          newSlot[2] = (baseId >> 16) & 0xFF;
          newSlot[3] = separator;
          newSlot[4] = baseId & 0xFF;
          newSlot[5] = (baseId >> 8) & 0xFF;
          newSlot[6] = (baseId >> 16) & 0xFF;
          newSlot[7] = (baseId >> 24) & 0xFF;
          newSlot[8]  = clampedQty & 0xFF;
          newSlot[9]  = (clampedQty >> 8) & 0xFF;
          newSlot[10] = (clampedQty >> 16) & 0xFF;
          newSlot[11] = (clampedQty >> 24) & 0xFF;
          newSlot[12] = 0x90;
          newSlot[13] = 0xA0;
          newSlot[14] = 0xEE;
          newSlot[15] = 0x02;
          data.set(newSlot, offset);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  editItem(slotIndex: number, qty: number, upgradeLevel: number, infusion: number): void {
    const item = this.readSlot(slotIndex);
    if (item.isEmpty) return;
    const raw = new Uint8Array(item.getRawData());

    // Update quantity
    raw[8]  = qty & 0xFF;
    raw[9]  = (qty >> 8) & 0xFF;
    raw[10] = (qty >> 16) & 0xFF;
    raw[11] = (qty >> 24) & 0xFF;

    // Update upgrade/infusion for weapons
    if (raw[3] === 0x80) {
      const baseId = item.baseItemId;
      const modifier = (infusion * 100) + upgradeLevel;
      const baseLow16 = baseId & 0xFFFF;
      const baseHigh16 = (baseId >>> 16) & 0xFFFF;
      const newLow16 = (baseLow16 + modifier) & 0xFFFF;
      const finalItemId = ((baseHigh16 << 16) | newLow16) >>> 0;
      raw[4] = finalItemId & 0xFF;
      raw[5] = (finalItemId >> 8) & 0xFF;
      raw[6] = (finalItemId >> 16) & 0xFF;
      raw[7] = (finalItemId >> 24) & 0xFF;
      // bytes 0-2 stay as gaHighest (don't change)

      // Also update the GA table entry — the game reads item ID from there
      const gaHighest = raw[0] | (raw[1] << 8);
      this.updateGAEntryItemId(gaHighest, finalItemId);
    }

    this.writeSlot(slotIndex, new DS3InventoryItem(raw, slotIndex, this.itemsDatabase));
  }

  /**
   * Update item ID in an existing GA table entry identified by its gaHighest index.
   * Bytes 4-7 of the 60-byte entry hold the item ID.
   */
  private updateGAEntryItemId(gaHighest: number, newItemId: number): void {
    const data = this.character.getRawData();
    const { items } = this.scanGATable(data);
    for (const entry of items) {
      if (entry.handle === 0) continue;
      if ((entry.handle & 0xFFFF) === gaHighest) {
        data[entry.offset + 4] = newItemId & 0xFF;
        data[entry.offset + 5] = (newItemId >> 8) & 0xFF;
        data[entry.offset + 6] = (newItemId >> 16) & 0xFF;
        data[entry.offset + 7] = (newItemId >> 24) & 0xFF;
        console.log(`[DS3 GA] Updated itemId for gaHighest=${gaHighest} → 0x${newItemId.toString(16)}`);
        return;
      }
    }
    console.warn(`[DS3 GA] GA entry for gaHighest=${gaHighest} not found`);
  }

  addAllItems(collectionType: ItemCollectionType): void {
    if (!this.itemsDatabase) return;
    const map: Record<string, Item[] | undefined> = {
      [ItemCollectionType.Weapon]:      this.itemsDatabase.weapon_items,
      [ItemCollectionType.Armor]:       this.itemsDatabase.armor_items,
      [ItemCollectionType.Ring]:        this.itemsDatabase.ring_items,
      [ItemCollectionType.Consumable]:  this.itemsDatabase.consumable_items,
      [ItemCollectionType.Magic]:       this.itemsDatabase.magic_items,
      [ItemCollectionType.Ore]:         this.itemsDatabase.ore_items,
      [ItemCollectionType.Key]:         this.itemsDatabase.key_items,
      [ItemCollectionType.Ammunition]:  this.itemsDatabase.ammunition_items,
      [ItemCollectionType.Covenant]:    this.itemsDatabase.covenant_items,
    };
    const items = map[collectionType] || [];
    for (const item of items) {
      try {
        this.addItem(item, Math.min(1, item.MaxStackCount));
      } catch {
        // skip if no space
      }
    }
  }

  clearAllItems(collectionType: ItemCollectionType): void {
    for (const item of this.getItemsByType(collectionType)) {
      this.deleteItem(item.slotIndex);
    }
  }

  /**
   * Add a key item to the key section (separate from regular inventory)
   */
  private addKeyItem(itemInfo: Item): number | null {
    const data = this.character.getRawData();
    const currentCount = this.getKeyItemCount(data);
    if (currentCount >= DS3Inventory.MAX_KEY_SLOTS) {
      console.warn('[DS3 Inventory] Key section full');
      return null;
    }

    // Check if key already exists
    const existing = this.findExistingItem(itemInfo);
    if (existing) return existing.slotIndex;

    const finalItemId = this.parseHex(itemInfo.Id);
    const newSlot = new Uint8Array(16);
    newSlot[0] = finalItemId & 0xFF;
    newSlot[1] = (finalItemId >> 8) & 0xFF;
    newSlot[2] = (finalItemId >> 16) & 0xFF;
    newSlot[3] = 0xB0;
    newSlot[4] = finalItemId & 0xFF;
    newSlot[5] = (finalItemId >> 8) & 0xFF;
    newSlot[6] = (finalItemId >> 16) & 0xFF;
    newSlot[7] = (finalItemId >> 24) & 0xFF;
    newSlot[8]  = 1; // quantity
    newSlot[12] = 0x90; newSlot[13] = 0xA0;
    newSlot[14] = 0xEE; newSlot[15] = 0x02;

    const slotIndex = DS3Inventory.KEY_SLOT_BASE + currentCount;
    const newItem = new DS3InventoryItem(newSlot, slotIndex, this.itemsDatabase);
    this.writeSlot(slotIndex, newItem);
    this.setKeyItemCount(data, currentCount + 1);

    console.log(`[DS3 Key] Added ${itemInfo.Name} to key slot ${currentCount}`);
    return slotIndex;
  }

  /**
   * Delete item from slot (regular or key section)
   */
  deleteItem(slotIndex: number): void {
    const emptyItem = new DS3InventoryItem(new Uint8Array(16).fill(0x00), slotIndex, this.itemsDatabase);
    this.writeSlot(slotIndex, emptyItem);
    // For key items: decrement count and compact
    if (slotIndex >= DS3Inventory.KEY_SLOT_BASE) {
      const data = this.character.getRawData();
      const count = this.getKeyItemCount(data);
      const keyIdx = slotIndex - DS3Inventory.KEY_SLOT_BASE;
      const invStart = this.getInventoryStartOffset();
      const sectionBase = invStart + DS3Inventory.KEY_SECTION_OFFSET + 4;
      // Shift remaining key items down to fill the gap
      for (let i = keyIdx; i < count - 1; i++) {
        const src = sectionBase + (i + 1) * DS3Inventory.ITEM_SIZE;
        const dst = sectionBase + i * DS3Inventory.ITEM_SIZE;
        data.set(data.slice(src, src + DS3Inventory.ITEM_SIZE), dst);
      }
      // Zero last slot
      data.fill(0x00, sectionBase + (count - 1) * DS3Inventory.ITEM_SIZE, sectionBase + count * DS3Inventory.ITEM_SIZE);
      this.setKeyItemCount(data, Math.max(0, count - 1));
    }
  }

  private parseHex(hex: string): number {
    return parseInt(hex.replace('0x', '').replace('0X', ''), 16);
  }

  private getCollectionTypeFromItem(item: Item): ItemCollectionType {
    if (!this.itemsDatabase) return ItemCollectionType.Unknown;

    if (this.itemsDatabase.weapon_items?.includes(item)) return ItemCollectionType.Weapon;
    if (this.itemsDatabase.covenant_items?.includes(item)) return ItemCollectionType.Covenant;
    if (this.itemsDatabase.ring_items?.includes(item)) return ItemCollectionType.Ring;
    if (this.itemsDatabase.armor_items?.includes(item)) return ItemCollectionType.Armor;
    if (this.itemsDatabase.consumable_items?.includes(item)) return ItemCollectionType.Consumable;
    if (this.itemsDatabase.magic_items?.includes(item)) return ItemCollectionType.Magic;
    if (this.itemsDatabase.ore_items?.includes(item)) return ItemCollectionType.Ore;
    if (this.itemsDatabase.key_items?.includes(item)) return ItemCollectionType.Key;
    if (this.itemsDatabase.ammunition_items?.includes(item)) return ItemCollectionType.Ammunition;

    return ItemCollectionType.Unknown;
  }
}
