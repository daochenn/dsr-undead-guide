import React, { useState, useEffect } from 'react';
import { Character } from '../lib/Character';
import { useLang } from '../../../core/context/LanguageContext';
import { t } from '../lib/i18n';

interface BonfiresTabProps {
  character: Character;
  onCharacterUpdate: () => void;
}

export const BonfiresTab: React.FC<BonfiresTabProps> = ({ character, onCharacterUpdate }) => {
  const { lang } = useLang();
  const [bonfireStatus, setBonfireStatus] = useState<{
    unlocked: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getStatus = (char: Character) => {
    try {
      const isUnlocked = char.areBonfiresUnlocked();
      setError(null);
      return { unlocked: isUnlocked };
    } catch (err: any) {
      setError(err.message || 'Error checking bonfire status');
      return null;
    }
  };

  useEffect(() => {
    const status = getStatus(character);
    if (status) {
      setBonfireStatus(status);
    } else {
      setBonfireStatus(null);
    }
  }, [character]);

  const handleUnlockAll = () => {
    try {
      character.unlockAllBonfires();

      // Update status
      const status = getStatus(character);
      if (status) {
        setBonfireStatus(status);
      }

      onCharacterUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to unlock bonfires');
    }
  };

  return (
    <div className="bonfires-tab">
      <h2>{t('bonfires', lang)}</h2>

      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {bonfireStatus && (
        <div className="bonfire-info">
          <div className="status-section">
            <h3>{t('status', lang)}</h3>
            <div className="status-display">
              <span className={`status-indicator ${bonfireStatus.unlocked ? 'unlocked' : 'locked'}`}>
                {bonfireStatus.unlocked ? t('allUnlocked', lang) : t('notAllUnlocked', lang)}
              </span>
            </div>
          </div>

          <div className="actions-section">
            <button
              className="unlock-button primary-button"
              onClick={handleUnlockAll}
              disabled={bonfireStatus.unlocked}
            >
              {bonfireStatus.unlocked ? t('alreadyUnlocked', lang) : t('unlockAll', lang)}
            </button>
          </div>

          <div className="info-section">
            <h4>{t('info', lang)}</h4>
            <ul>
              <li>{t('infoText1', lang)}</li>
              <li>{t('infoText2', lang)}</li>
            </ul>
          </div>
        </div>
      )}

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

        .bonfire-info {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .status-section {
          background: rgba(255, 255, 255, 0.03);
          padding: 0.65rem 0.85rem;
          border-radius: 4px;
          border: 1px solid #252525;
        }

        .status-section h3 {
          font-size: 0.75rem;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 0.5rem;
        }

        .status-display {
          margin: 0;
        }

        .status-indicator {
          display: inline-block;
          padding: 0.3rem 0.65rem;
          border-radius: 3px;
          font-weight: 500;
          font-size: 0.82rem;
        }

        .status-indicator.unlocked {
          background: rgba(76, 175, 80, 0.1);
          color: #5a9a5a;
          border: 1px solid rgba(76, 175, 80, 0.25);
        }

        .status-indicator.locked {
          background: rgba(255, 152, 0, 0.08);
          color: #a07830;
          border: 1px solid rgba(255, 152, 0, 0.2);
        }

        .actions-section {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
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
          align-self: flex-start;
        }

        .primary-button:hover:not(:disabled) {
          background: rgba(76, 175, 80, 0.18);
          border-color: rgba(76, 175, 80, 0.5);
        }

        .primary-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .info-section {
          background: rgba(33, 150, 243, 0.05);
          padding: 0.65rem 0.85rem;
          border-radius: 4px;
          border-left: 2px solid rgba(33, 150, 243, 0.3);
        }

        .info-section h4 {
          margin: 0 0 0.4rem;
          font-size: 0.78rem;
          color: #888;
          font-weight: 600;
        }

        .info-section ul {
          margin: 0;
          padding-left: 1.25rem;
          color: #666;
          font-size: 0.78rem;
          line-height: 1.6;
        }

        .info-section li {
          margin: 0.15rem 0;
        }

        .info-section strong {
          color: #888;
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