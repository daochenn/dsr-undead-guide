import React, { useState } from 'react';
import { Character } from '../lib/Character';
import { useLang } from '../../../core/context/LanguageContext';
import { t } from '../lib/i18n';
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

const TAB_KEYS: Record<TabType, string> = {
  general: 'tab_general',
  appearance: 'tab_appearance',
  inventory: 'tab_inventory',
  bonfires: 'tab_bonfires',
  npcs: 'tab_npcs',
  bosses: 'tab_bosses',
  table: 'tab_table',
};

export const TabPanel: React.FC<TabPanelProps> = ({ character, onCharacterUpdate, safeMode }) => {
  const { lang } = useLang();
  const [activeTab, setActiveTab] = useState<TabType>('general');

  if (!character) {
    return (
      <div className="tab-panel">
        <div className="no-character">
          {t('selectChar', lang)}
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
              {t(TAB_KEYS[tab], lang)}
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
