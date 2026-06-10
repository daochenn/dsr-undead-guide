import React, { useState, useEffect } from 'react';
import { Character } from '../lib/Character';
import { useLang } from '../../../core/context/LanguageContext';
import { t } from '../lib/i18n';

interface BonfiresTabProps {
  character: Character;
  onCharacterUpdate: () => void;
}

// 20 warpable bonfire names (matching the bit order in Character.ts)
// Confirmed: +0x6B bit0=PaintedWorld, +0x6C bit1=Depths, bit2=OolacileTownship, bit3=Chasm, bit4=Oolacile, bit5=OolacileSanctuary
// Unconfirmed bits are marked with ???
const BONFIRE_NAMES: Record<Lang, string[]> = {
  en: [
    'Painted World of Ariamis', '???', '???', '???',
    '???', '???', '???', '???',
    '???', 'Depths', 'Oolacile Township Dungeon', 'Chasm of the Abyss',
    'Oolacile', 'Oolacile Sanctuary', '???', '???',
    '???', '???', '???', '???'
  ],
  zh: [
    '绘画世界·亚米阿斯', '???', '???', '???',
    '???', '???', '???', '???',
    '???', '下水道', '乌拉席露地下墓地', '深渊裂缝',
    '乌拉席露', '乌拉席露圣所', '???', '???',
    '???', '???', '???', '???'
  ]
};

type Lang = 'en' | 'zh';

export const BonfiresTab: React.FC<BonfiresTabProps> = ({ character, onCharacterUpdate }) => {
  const { lang } = useLang();
  const [bonfires, setBonfires] = useState<boolean[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = () => {
    try {
      const flags = character.getBonfireWarpFlags();
      setBonfires(flags);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error checking bonfire status');
    }
  };

  useEffect(() => {
    loadStatus();
  }, [character]);

  const handleToggle = (index: number) => {
    try {
      const newState = !bonfires[index];
      character.setBonfireWarpFlag(index, newState);
      const newBonfires = [...bonfires];
      newBonfires[index] = newState;
      setBonfires(newBonfires);
      onCharacterUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle bonfire');
    }
  };

  const handleUnlockAll = () => {
    try {
      character.unlockAllBonfires();
      const flags = character.getBonfireWarpFlags();
      setBonfires(flags);
      onCharacterUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to unlock bonfires');
    }
  };

  const allUnlocked = bonfires.length > 0 && bonfires.every(b => b);
  const names = BONFIRE_NAMES[lang] || BONFIRE_NAMES.en;
  const unlockedCount = bonfires.filter(b => b).length;

  return (
    <div className="bonfires-tab">
      <h2>{t('bonfires', lang)}</h2>

      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="bonfire-actions">
        <button
          className="unlock-button primary-button"
          onClick={handleUnlockAll}
          disabled={allUnlocked}
        >
          {allUnlocked ? t('alreadyUnlocked', lang) : t('unlockAll', lang)}
        </button>
        <span className="bonfire-count">
          {unlockedCount} / {bonfires.length}
        </span>
      </div>

      <div className="bonfire-grid">
        {names.map((name, i) => (
          <div
            key={i}
            className={`bonfire-item ${bonfires[i] ? 'unlocked' : 'locked'}`}
            onClick={() => handleToggle(i)}
          >
            <span className="bonfire-icon">{bonfires[i] ? '🔥' : '○'}</span>
            <span className="bonfire-name">{name}</span>
          </div>
        ))}
      </div>

      <style>{`
        .bonfires-tab {
          padding: 0;
        }

        .bonfires-tab h2 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #c0c0c0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 0.75rem;
          padding-bottom: 0.4rem;
          border-bottom: 1px solid rgba(255, 107, 53, 0.25);
        }

        .bonfire-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .primary-button {
          background: rgba(76, 175, 80, 0.12);
          color: #5a9a5a;
          border: 1px solid rgba(76, 175, 80, 0.3);
          padding: 0.5rem 1.25rem;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }

        .primary-button:hover:not(:disabled) {
          background: rgba(76, 175, 80, 0.18);
          border-color: rgba(76, 175, 80, 0.5);
        }

        .primary-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .bonfire-count {
          font-size: 0.8rem;
          color: #666;
        }

        .bonfire-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 0.5rem;
        }

        .bonfire-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .bonfire-item.unlocked {
          background: rgba(255, 107, 53, 0.08);
          border-color: rgba(255, 107, 53, 0.2);
        }

        .bonfire-item.locked {
          background: rgba(255, 255, 255, 0.02);
          opacity: 0.5;
        }

        .bonfire-item:hover {
          border-color: rgba(255, 107, 53, 0.4);
        }

        .bonfire-icon {
          font-size: 1rem;
        }

        .bonfire-name {
          font-size: 0.8rem;
          color: #c0c0c0;
        }

        .error-message {
          background: rgba(244, 67, 54, 0.07);
          padding: 0.6rem 0.75rem;
          border-radius: 4px;
          border-left: 2px solid rgba(244, 67, 54, 0.4);
          color: #c05050;
          font-size: 0.82rem;
        }
      `}</style>
    </div>
  );
};
