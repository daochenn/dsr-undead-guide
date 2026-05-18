import React, { useState } from 'react';
import { Character } from '../lib/Character';
import { GeneralTab } from './GeneralTab';
import { InventoryTab } from './InventoryTab';
import { BonfiresTab } from './BonfiresTab';
import { NPCsTab } from './NPCsTab';
import { BossesTab } from './BossesTab';
import { TableTab } from './TableTab';
import { AppearanceTab } from './AppearanceTab';

interface TabPanelProps {
  character: Character | null;
  onCharacterUpdate: () => void;
  safeMode: boolean;
}

type TabType = 'general' | 'appearance' | 'inventory' | 'bonfires' | 'npcs' | 'bosses' | 'table';

export const TabPanel: React.FC<TabPanelProps> = ({ character, onCharacterUpdate, safeMode }) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  if (!character) {
    return (
      <div className="tab-panel">
        <div className="no-character">
          Select a character to edit
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <div className="tabs-header">
        <div className="tabs">
          {(['general', 'appearance', 'inventory', 'bonfires', 'npcs', 'bosses', 'table'] as TabType[]).map(tab => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="tab-content">
        {activeTab === 'general' && (
          <GeneralTab character={character} onCharacterUpdate={onCharacterUpdate} safeMode={safeMode} />
        )}
        {activeTab === 'appearance' && (
          <AppearanceTab character={character} onCharacterUpdate={onCharacterUpdate} />
        )}
        {activeTab === 'inventory' && (
          <InventoryTab character={character} onCharacterUpdate={onCharacterUpdate} safeMode={safeMode} />
        )}
        {activeTab === 'bonfires' && (
          <BonfiresTab character={character} onCharacterUpdate={onCharacterUpdate} />
        )}
        {activeTab === 'npcs' && (
          <NPCsTab character={character} onCharacterUpdate={onCharacterUpdate} />
        )}
        {activeTab === 'bosses' && (
          <BossesTab character={character} onCharacterUpdate={onCharacterUpdate} />
        )}
        {activeTab === 'table' && (
          <TableTab character={character} onCharacterUpdate={onCharacterUpdate} />
        )}
      </div>
    </div>
  );
};
