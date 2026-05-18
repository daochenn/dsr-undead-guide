import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../shared/components/Layout';
import { FileUpload, CharacterList, TabPanel, SaveWarningModal, type FileUploadRef } from './components';
import { useDS3SaveEditor } from './hooks';

const logoImg = (import.meta.env.MODE === 'static' || typeof window !== 'undefined' && window.location.protocol === 'file:')
  ? 'ds3logo.png'
  : '/ds3logo.png';

interface DS3AppProps {
  onHome?: () => void;
}

function useTimeAgo(date: Date | null): string {
  const [label, setLabel] = useState('');

  const compute = useCallback(() => {
    if (!date) return '';
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60) return 'loaded just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `loaded ${mins} min ago`;
    const hours = Math.floor(mins / 60);
    return `loaded ${hours} hour${hours > 1 ? 's' : ''} ago`;
  }, [date]);

  useEffect(() => {
    if (!date) { setLabel(''); return; }
    setLabel(compute());
    const id = setInterval(() => setLabel(compute()), 30_000);
    return () => clearInterval(id);
  }, [date, compute]);

  return label;
}

export const DS3App: React.FC<DS3AppProps> = ({ onHome }) => {
  const fileUploadRef = useRef<FileUploadRef>(null);
  const [showSaveWarning, setShowSaveWarning] = useState(false);
  const navigate = useNavigate();

  const {
    saveEditor,
    characters,
    selectedCharacterIndex,
    originalFilename,
    handleFileLoaded,
    handleCharacterSelect,
    handleCharacterUpdate,
    handleSave,
    handleSaveAs,
    handleReload,
  } = useDS3SaveEditor(fileUploadRef);

  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [safeMode, setSafeMode] = useState(true);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const timeAgo = useTimeAgo(loadedAt);

  useEffect(() => {
    if (saveEditor) setLoadedAt(new Date());
  }, [saveEditor]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        navigate('/ds3/offset-search');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const handleSaveAsClick = () => {
    const hasShownWarning = localStorage.getItem('ds3-save-as-warning-shown');
    if (!hasShownWarning) {
      setShowSaveWarning(true);
    } else {
      handleSaveAs();
    }
  };

  const handleWarningConfirm = () => {
    localStorage.setItem('ds3-save-as-warning-shown', 'true');
    setShowSaveWarning(false);
    handleSaveAs();
  };

  const selectedCharacter = selectedCharacterIndex !== null
    ? characters[selectedCharacterIndex]
    : null;

  const canSave = !!saveEditor?.hasFileHandle();

  const sidebar = (
    <>
      <FileUpload
        ref={fileUploadRef}
        onFileLoaded={handleFileLoaded}
        onAutoLoadAttempt={setIsAutoLoading}
      />
      {isAutoLoading && (
        <div className="loading-indicator">
          Loading last save file...
        </div>
      )}
      {characters.length > 0 && (
        <CharacterList
          characters={characters}
          selectedIndex={selectedCharacterIndex}
          onSelectCharacter={handleCharacterSelect}
        />
      )}
    </>
  );

  return (
    <AppLayout
      title="Dark Souls 3 Save Editor"
      icon={logoImg}
      showHomeButton={!!onHome}
      onHome={onHome}
      sidebar={sidebar}
      showTutorialButton={false}
      showGameNav={true}
      currentGame="ds3"
    >
      <div style={{
        background: 'linear-gradient(135deg, #7a3a00, #5a2a00)',
        border: '1px solid #c8650a',
        borderRadius: '6px',
        padding: '10px 16px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.9rem',
        color: '#ffd580',
      }}>
        <span style={{ fontSize: '1.1rem' }}>⚠️</span>
        <span>
          <strong>Beta:</strong> DS3 editor is still being tested. It is recommended to use it <strong>offline only</strong> to avoid bans.
        </span>
      </div>
      {saveEditor && (
        <div className="ds1-subheader">
          <div className="ds1-subheader-info">
            <span className="ds1-filename">{originalFilename}</span>
            {timeAgo && <span className="ds1-loaded-label">{timeAgo}</span>}
          </div>
          <div className="ds1-subheader-actions">
            <button className="ds1-action-btn" onClick={handleReload}>
              ⟳ Reload
            </button>
            <button
              className="ds1-safemode-btn"
              onClick={() => setSafeMode(v => !v)}
              title="Auto-adjust Level, HP/FP/Stamina based on stats."
            >
              <span className={`ds1-safemode-dot ${safeMode ? 'on' : 'off'}`}>●</span>
              Safe Mode
              <span className={`ds1-safemode-badge ${safeMode ? 'on' : 'off'}`}>
                {safeMode ? 'ON' : 'OFF'}
              </span>
            </button>
            <button
              className="ds1-action-btn"
              onClick={handleSave}
              disabled={!canSave}
            >
              Save
            </button>
            <button className="ds1-action-btn" onClick={handleSaveAsClick}>
              Save As
            </button>
          </div>
        </div>
      )}

      <TabPanel
        character={selectedCharacter}
        onCharacterUpdate={handleCharacterUpdate}
        safeMode={safeMode}
        onSafeModeChange={setSafeMode}
      />

      <SaveWarningModal
        isOpen={showSaveWarning}
        onConfirm={handleWarningConfirm}
      />
    </AppLayout>
  );
};
