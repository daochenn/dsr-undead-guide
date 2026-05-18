import React, { useState, useEffect, useCallback } from 'react';
import { DS3Character } from '../lib/Character';
import { DS3Inventory, ItemCollectionType, DS3InventoryItem, ItemInfusion } from '../lib/Inventory';
import { ItemCreateDialog } from './ItemCreateDialog';
import { ItemEditDialog } from './ItemEditDialog';

interface InventoryTabProps {
  character: DS3Character;
  onCharacterUpdate: () => void;
  safeMode: boolean;
}

type SubTabType = 'consumables' | 'magic' | 'weapons' | 'armor' | 'ores' | 'ammunition' | 'rings' | 'key' | 'covenants';

const SUB_TAB_LABELS: Record<SubTabType, string> = {
  consumables: 'Consumables',
  magic: 'Magic',
  weapons: 'Weapons',
  armor: 'Armor',
  ores: 'Ores',
  ammunition: 'Ammunition',
  rings: 'Rings',
  key: 'Key Items',
  covenants: 'Covenants',
};

const SUB_TAB_TO_COLLECTION: Record<SubTabType, ItemCollectionType> = {
  consumables: ItemCollectionType.Consumable,
  magic: ItemCollectionType.Magic,
  weapons: ItemCollectionType.Weapon,
  armor: ItemCollectionType.Armor,
  ores: ItemCollectionType.Ore,
  ammunition: ItemCollectionType.Ammunition,
  rings: ItemCollectionType.Ring,
  key: ItemCollectionType.Key,
  covenants: ItemCollectionType.Covenant,
};

export const InventoryTab: React.FC<InventoryTabProps> = ({ character, onCharacterUpdate, safeMode }) => {
  const [inventory, setInventory] = useState(() => new DS3Inventory(character));
  const [items, setItems] = useState<DS3InventoryItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('consumables');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [infusionFilter, setInfusionFilter] = useState<ItemInfusion | 'all'>('all');
  const [upgradeFilter, setUpgradeFilter] = useState<number | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<DS3InventoryItem | null>(null);
  const itemRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

  // Weapons with MaxUpgrade=5 count each level as 2 WL (so +5 = WL 10)
  const getEffectiveWL = (item: DS3InventoryItem): number => {
    const maxUp = item.itemInfo?.MaxUpgrade ?? 10;
    return item.upgradeLevel * (maxUp === 5 ? 2 : 1);
  };

  const refreshItems = useCallback((inv?: DS3Inventory) => {
    const instance = inv || inventory;
    if (!instance) return;
    const collectionType = SUB_TAB_TO_COLLECTION[activeSubTab];
    let filtered = instance.getItemsByType(collectionType);

    if (safeMode) {
      filtered = filtered.filter(item => {
        const n = item.itemName;
        return !n.startsWith('Unknown (') && n !== 'Fists' && n !== 'Fist';
      });
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (infusionFilter !== 'all' && activeSubTab === 'weapons') {
      filtered = filtered.filter(item => item.infusion === infusionFilter);
    }

    if (upgradeFilter !== 'all' && activeSubTab === 'weapons') {
      filtered = filtered.filter(item => getEffectiveWL(item) === upgradeFilter);
    }

    setItems(filtered);
  }, [inventory, activeSubTab, safeMode, searchQuery, infusionFilter, upgradeFilter]);

  useEffect(() => {
    const newInventory = new DS3Inventory(character);
    setInventory(newInventory);
    const load = async () => {
      setLoading(true);
      try {
        await newInventory.loadItemsDatabase();
        refreshItems(newInventory);
      } catch (err) {
        console.error(err);
        alert(`Failed to load DS3 items database: ${err instanceof Error ? err.message : String(err)}`);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

  useEffect(() => {
    if (!loading && inventory) refreshItems();
  }, [activeSubTab, loading, searchQuery, infusionFilter, upgradeFilter, safeMode, inventory, refreshItems]);

  const handleItemCreated = (slotIndex: number | null) => {
    refreshItems();
    onCharacterUpdate();
    if (slotIndex !== null) {
      setTimeout(() => {
        itemRefs.current.get(slotIndex)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleDeleteItem = (slotIndex: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      inventory.deleteItem(slotIndex);
      refreshItems();
      onCharacterUpdate();
    }
  };

  const handleItemUpdated = () => {
    refreshItems();
    onCharacterUpdate();
  };

  const handleAddAll = () => {
    inventory.addAllItems(SUB_TAB_TO_COLLECTION[activeSubTab]);
    refreshItems();
    onCharacterUpdate();
  };

  const handleClearAll = () => {
    if (confirm('Clear all items in this category?')) {
      inventory.clearAllItems(SUB_TAB_TO_COLLECTION[activeSubTab]);
      refreshItems();
      onCharacterUpdate();
    }
  };

  const getInfusionName = (inf: ItemInfusion): string => {
    const names: Record<number, string> = {
      [ItemInfusion.Standard]: '',
      [ItemInfusion.Heavy]: 'Heavy',
      [ItemInfusion.Sharp]: 'Sharp',
      [ItemInfusion.Refined]: 'Refined',
      [ItemInfusion.Simple]: 'Simple',
      [ItemInfusion.Crystal]: 'Crystal',
      [ItemInfusion.Fire]: 'Fire',
      [ItemInfusion.Chaos]: 'Chaos',
      [ItemInfusion.Lightning]: 'Lightning',
      [ItemInfusion.Deep]: 'Deep',
      [ItemInfusion.Dark]: 'Dark',
      [ItemInfusion.Poison]: 'Poison',
      [ItemInfusion.Blood]: 'Blood',
      [ItemInfusion.Raw]: 'Raw',
      [ItemInfusion.Blessed]: 'Blessed',
      [ItemInfusion.Hollow]: 'Hollow',
    };
    return names[inf] ?? '';
  };

  const formatItemDisplay = (item: DS3InventoryItem): string => {
    const infStr = item.infusion !== ItemInfusion.Standard ? `${getInfusionName(item.infusion)} ` : '';
    const upStr = item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : '';
    return `${infStr}${item.itemName}${upStr}`;
  };

  const getStorageQty = (item: DS3InventoryItem): number => {
    try {
      return inventory.getStorageQuantity(item.baseItemId);
    } catch {
      return 0;
    }
  };

  const showQtyColumn = activeSubTab !== 'weapons' && activeSubTab !== 'armor' && activeSubTab !== 'rings';

  if (loading) {
    return <div className="inventory-tab"><div className="loading">Loading inventory...</div></div>;
  }

  return (
    <div className="inventory-tab">
      <div className="inventory-header">
        <button className="create-item-button" onClick={() => setShowCreateDialog(true)}>
          + Create Item
        </button>
        <button className="create-item-button add-all-button" onClick={handleAddAll}>
          + Add All
        </button>
        <button className="delete-button clear-all-button" onClick={handleClearAll}>
          Clear All
        </button>

        <div className="inventory-search">
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {activeSubTab === 'weapons' && (
          <div className="filter-group">
            <label>Infusion:</label>
            <select
              value={infusionFilter}
              onChange={e => setInfusionFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value) as ItemInfusion)}
              className="filter-select"
            >
              <option value="all">All</option>
              <option value={ItemInfusion.Standard}>Standard</option>
              <option value={ItemInfusion.Heavy}>Heavy</option>
              <option value={ItemInfusion.Sharp}>Sharp</option>
              <option value={ItemInfusion.Refined}>Refined</option>
              <option value={ItemInfusion.Simple}>Simple</option>
              <option value={ItemInfusion.Crystal}>Crystal</option>
              <option value={ItemInfusion.Fire}>Fire</option>
              <option value={ItemInfusion.Chaos}>Chaos</option>
              <option value={ItemInfusion.Lightning}>Lightning</option>
              <option value={ItemInfusion.Deep}>Deep</option>
              <option value={ItemInfusion.Dark}>Dark</option>
              <option value={ItemInfusion.Poison}>Poison</option>
              <option value={ItemInfusion.Blood}>Blood</option>
              <option value={ItemInfusion.Raw}>Raw</option>
              <option value={ItemInfusion.Blessed}>Blessed</option>
              <option value={ItemInfusion.Hollow}>Hollow</option>
            </select>
          </div>
        )}

        {activeSubTab === 'weapons' && (
          <div className="filter-group">
            <label>WL:</label>
            <select
              value={upgradeFilter}
              onChange={e => setUpgradeFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="filter-select"
            >
              <option value="all">All</option>
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="sub-tabs">
        {(Object.keys(SUB_TAB_LABELS) as SubTabType[]).map(tab => (
          <button
            key={tab}
            className={`sub-tab ${activeSubTab === tab ? 'active' : ''}`}
            onClick={() => setActiveSubTab(tab)}
          >
            {SUB_TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="inventory-content">
        {items.length === 0 ? (
          <div className="no-items">No items in this category</div>
        ) : (
          <div className="items-list">
            {items.map(item => {
              const storageQty = getStorageQty(item);
              return (
                <div
                  key={item.slotIndex}
                  className="item-row"
                  ref={el => {
                    if (el) itemRefs.current.set(item.slotIndex, el);
                    else itemRefs.current.delete(item.slotIndex);
                  }}
                >
                  <div className="item-info">
                    <span className="item-name">{formatItemDisplay(item)}</span>
                    <div className="item-details">
                      {showQtyColumn && (
                        <span className="item-detail">
                          {storageQty > 0
                            ? `${item.quantity} / ${storageQty}`
                            : `Qty: ${item.quantity}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="item-actions">
                    <button className="edit-button" onClick={() => setEditingItem(item)}>Edit</button>
                    <button className="delete-button" onClick={() => handleDeleteItem(item.slotIndex)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateDialog && (
        <ItemCreateDialog
          inventory={inventory}
          collectionType={SUB_TAB_TO_COLLECTION[activeSubTab]}
          onClose={() => setShowCreateDialog(false)}
          onItemCreated={handleItemCreated}
          safeMode={safeMode}
        />
      )}

      {editingItem && (
        <ItemEditDialog
          inventory={inventory}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onItemUpdated={handleItemUpdated}
          safeMode={safeMode}
        />
      )}
    </div>
  );
};
