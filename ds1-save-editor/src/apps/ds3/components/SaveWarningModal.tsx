import React, { useState } from 'react';
import './SaveWarningModal.css';

interface SaveWarningModalProps {
  isOpen: boolean;
  onConfirm: () => void;
}

export const SaveWarningModal: React.FC<SaveWarningModalProps> = ({
  isOpen,
  onConfirm,
}) => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(key);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const appDataPath = '%APPDATA%\\DarkSoulsIII';

  return (
    <div className="modal-overlay">
      <div className="modal-content ds3-limits-modal">
        <div className="modal-header">
          <h2>⚠️ DS3 Browser Limitations</h2>
          <p className="modal-subtitle">
            DS3 saves are in <code>AppData</code> — Chrome can read but not write there directly.
          </p>
        </div>
        <div className="modal-body">

          {/* Option 1 */}
          <div className="limit-option">
            <div className="limit-option-num">1</div>
            <div className="limit-option-body">
              <div className="limit-option-title">
                <strong>Save As → Copy back</strong>
                <span className="option-tag">Browser</span>
              </div>
              <p>
                Use <kbd>Save As</kbd> to save the edited file to Desktop or Downloads,
                then copy it to your DS3 save folder, replacing the original.
              </p>
              <div className="path-copy-container">
                <code>{appDataPath}</code>
                <button
                  className={`copy-path-button ${copiedItem === 'appdata' ? 'copied' : ''}`}
                  onClick={() => handleCopy(appDataPath, 'appdata')}
                >
                  {copiedItem === 'appdata' ? '✓' : '📋'}
                </button>
              </div>
              <p className="path-instruction"><kbd>Win+R</kbd> → paste path → Enter</p>
            </div>
          </div>

          {/* Option 2 */}
          <div className="limit-option">
            <div className="limit-option-num">2</div>
            <div className="limit-option-body">
              <div className="limit-option-title">
                <strong>Standalone Desktop App</strong>
                <span className="option-tag option-tag-green">No Restrictions</span>
              </div>
              <p>
                Desktop save editor with full AppData access — no browser restrictions,
                Save works directly.
              </p>
              <a
                className="nexus-link"
                href="https://www.nexusmods.com/darksouls3/mods/2245?tab=files"
                target="_blank"
                rel="noopener noreferrer"
              >
                🔗 Download on Nexus Mods
              </a>
            </div>
          </div>

        </div>
        <div className="modal-footer">
          <button className="modal-button modal-button-confirm" onClick={onConfirm}>
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
