import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { getDS3FileSystemAdapter, detectEnvironment, FileHandle } from '../../ds1/lib/adapters';

interface FileUploadProps {
  onFileLoaded: (file: File, fileHandle: FileHandle | null) => void;
  onAutoLoadAttempt?: (attempting: boolean) => void;
}

export interface FileUploadRef {
  openFileDialog: () => void;
}

/**
 * Resolves the default path for the DS3 save dialog in Tauri.
 * Returns %APPDATA%\DarkSoulsIII (parent of the app's own AppData dir + DarkSoulsIII).
 */
async function resolveDS3DefaultPath(): Promise<string | undefined> {
  try {
    const { appDataDir, dirname, join } = await import('@tauri-apps/api/path');
    const appData = await appDataDir();         // e.g. C:\Users\Name\AppData\Roaming\DS1 Save Editor
    const roaming = await dirname(appData);     // C:\Users\Name\AppData\Roaming
    return await join(roaming, 'DarkSoulsIII'); // C:\Users\Name\AppData\Roaming\DarkSoulsIII
  } catch {
    return undefined;
  }
}

export const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(({ onFileLoaded, onAutoLoadAttempt }, ref) => {
  const autoLoadAttemptedRef = useRef(false);
  const isTauri = detectEnvironment() === 'tauri';

  // Auto-load last used file on mount (Tauri only)
  useEffect(() => {
    if (!isTauri) return;
    if (autoLoadAttemptedRef.current) return;
    autoLoadAttemptedRef.current = true;

    const tryAutoLoad = async () => {
      const adapter = getDS3FileSystemAdapter();
      if (!adapter.supportsAutoLoad()) return;
      try {
        onAutoLoadAttempt?.(true);
        const fileData = await adapter.loadLastFile();
        if (!fileData) return;
        console.log(`[DS3 FileUpload] Auto-loading: ${fileData.file.name}`);
        onFileLoaded(fileData.file, fileData.handle);
      } catch (err) {
        console.warn('[DS3 FileUpload] Auto-load failed:', err);
      } finally {
        onAutoLoadAttempt?.(false);
      }
    };

    setTimeout(tryAutoLoad, 100);
  }, [isTauri, onFileLoaded, onAutoLoadAttempt]);

  const handleButtonClick = async () => {
    if (isTauri) {
      const adapter = getDS3FileSystemAdapter();
      try {
        const defaultPath = await resolveDS3DefaultPath();
        const fileData = await adapter.openFile({ defaultPath });
        if (fileData.handle) {
          await adapter.saveLastFile(fileData.handle, fileData.file.name);
        }
        onFileLoaded(fileData.file, fileData.handle);
      } catch (err: any) {
        if (err.message === 'User cancelled file selection') return;
        console.error('[DS3 FileUpload] Failed to open file:', err);
        alert('Failed to open file. Please try again.');
      }
    } else {
      // Web fallback: traditional file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.sl2';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) onFileLoaded(file, null);
      };
      input.click();
    }
  };

  useImperativeHandle(ref, () => ({
    openFileDialog: handleButtonClick,
  }));

  return (
    <div className="file-upload">
      <div className="button-with-help">
        <button className="upload-button" onClick={handleButtonClick}>
          Load Save File
        </button>
        <span className="help-icon" title="Full path: %APPDATA%\DarkSoulsIII\<user_id>\DS30000.sl2">
          ?
        </span>
      </div>
    </div>
  );
});
