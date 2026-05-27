import { useState, useCallback, RefObject } from 'react';
import { DS3SaveFileEditor } from '../lib/SaveFileEditor';
import { DS3Character } from '../lib/Character';
import { FileHandle } from '../../ds1/lib/adapters';
import type { FileUploadRef } from '../components/FileUpload';

export interface UseDS3SaveEditorResult {
  saveEditor: DS3SaveFileEditor | null;
  characters: DS3Character[];
  selectedCharacterIndex: number | null;
  originalFilename: string;
  isSlotActive: (slotIndex: number) => boolean;

  handleFileLoaded: (file: File, fileHandle: FileHandle | null) => Promise<void>;
  handleCharacterSelect: (index: number) => void;
  handleCharacterUpdate: () => void;
  handleSave: () => Promise<void>;
  handleSaveAs: () => Promise<void>;
  handleReload: () => void;
}

export const useDS3SaveEditor = (fileUploadRef: RefObject<FileUploadRef>): UseDS3SaveEditorResult => {
  const [saveEditor, setSaveEditor] = useState<DS3SaveFileEditor | null>(null);
  const [characters, setCharacters] = useState<DS3Character[]>([]);
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState<number | null>(null);
  const [, setUpdateTrigger] = useState(0);
  const [originalFilename, setOriginalFilename] = useState<string>('DS30000.sl2');

  const handleFileLoaded = useCallback(async (file: File, fileHandle: FileHandle | null) => {
    try {
      setOriginalFilename(file.name);

      const editor = await DS3SaveFileEditor.fromFileData(file, fileHandle);

      setSaveEditor(editor);
      const allCharacters = editor.getCharacters();
      setCharacters(allCharacters);

      // Select first non-empty character
      const firstNonEmptyIndex = allCharacters.findIndex(char => !char.isEmpty);
      setSelectedCharacterIndex(firstNonEmptyIndex !== -1 ? firstNonEmptyIndex : null);
    } catch (error) {
      console.error('Error loading save file:', error);
      alert('Error loading save file. Please make sure it is a valid Dark Souls 3 save file.');
    }
  }, []);

  const handleCharacterSelect = useCallback((index: number) => {
    setSelectedCharacterIndex(index);
  }, []);

  const handleCharacterUpdate = useCallback(() => {
    // Trigger re-render
    setUpdateTrigger(prev => prev + 1);
  }, []);

  const handleSave = useCallback(async () => {
    if (!saveEditor) return;
    setUpdateTrigger(prev => prev + 1);
    if (saveEditor.hasFileHandle()) {
      await saveEditor.saveToOriginalFile();
    } else {
      await saveEditor.downloadSaveFile(originalFilename);
    }
  }, [saveEditor, originalFilename]);

  const handleSaveAs = useCallback(async () => {
    if (!saveEditor) return;
    await saveEditor.saveToNewFile(originalFilename);
  }, [saveEditor, originalFilename]);

  const handleReload = useCallback(() => {
    // Open file dialog for reload
    fileUploadRef.current?.openFileDialog();
  }, [fileUploadRef]);

  const isSlotActive = useCallback((slotIndex: number): boolean => {
    return saveEditor ? saveEditor.isSlotActive(slotIndex) : false;
  }, [saveEditor]);

  return {
    saveEditor,
    characters,
    selectedCharacterIndex,
    originalFilename,
    isSlotActive,
    handleFileLoaded,
    handleCharacterSelect,
    handleCharacterUpdate,
    handleSave,
    handleSaveAs,
    handleReload,
  };
};
