import React, { useState } from 'react';
import { Character } from '../lib/Character';
import { useLang } from '../../../core/context/LanguageContext';

interface HelpTabProps {
  character: Character;
  onCharacterUpdate: () => void;
}

interface GuideButton {
  id: string;
  icon: string;
  name_en: string;
  name_zh: string;
}

const GUIDE_BUTTONS: GuideButton[] = [
  { id: 'where_to_go', icon: '🗺️', name_en: "I don't know where to go", name_zh: '我不知道现在去哪里' },
  { id: 'boss_help', icon: '⚔️', name_en: "I can't beat this boss", name_zh: '我打不过这个BOSS' },
  { id: 'upgrade_gear', icon: '🔧', name_en: 'What equipment to upgrade', name_zh: '该升级什么装备' },
  { id: 'find_gear', icon: '🛡️', name_en: 'Where to find equipment', name_zh: '什么装备该去哪里获取' },
];

export const HelpTab: React.FC<HelpTabProps> = ({ character: _character }) => {
  const { lang } = useLang();
  const [activeGuide, setActiveGuide] = useState<string | null>(null);

  const handleGuideClick = (id: string) => {
    setActiveGuide(prev => prev === id ? null : id);
  };

  return (
    <div className="help-tab">
      <h2>{lang === 'zh' ? '游戏帮助' : 'Game Guide'}</h2>

      <div className="guide-buttons">
        {GUIDE_BUTTONS.map(btn => (
          <button
            key={btn.id}
            className={`guide-btn ${activeGuide === btn.id ? 'active' : ''}`}
            onClick={() => handleGuideClick(btn.id)}
          >
            <span className="guide-btn-icon">{btn.icon}</span>
            <span className="guide-btn-text">{lang === 'zh' ? btn.name_zh : btn.name_en}</span>
          </button>
        ))}
      </div>

      {activeGuide && (
        <div className="guide-content">
          <div className="guide-placeholder">
            {lang === 'zh' ? '功能开发中...' : 'Coming soon...'}
          </div>
        </div>
      )}

      <style>{`
        .help-tab {
          padding: 0;
        }

        .help-tab h2 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #c0c0c0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 0.75rem;
          padding-bottom: 0.4rem;
          border-bottom: 1px solid rgba(255, 107, 53, 0.25);
        }

        .guide-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .guide-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.6rem 1rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          color: #b0b0b0;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.15s;
        }

        .guide-btn:hover {
          background: rgba(255, 107, 53, 0.1);
          border-color: rgba(255, 107, 53, 0.3);
          color: #e0e0e0;
        }

        .guide-btn.active {
          background: rgba(255, 107, 53, 0.15);
          border-color: rgba(255, 107, 53, 0.4);
          color: #ff6b35;
        }

        .guide-btn-icon {
          font-size: 0.9rem;
        }

        .guide-btn-text {
          white-space: nowrap;
        }

        .guide-content {
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 4px;
        }

        .guide-placeholder {
          font-size: 0.8rem;
          color: #666;
          text-align: center;
          padding: 1.5rem;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};
