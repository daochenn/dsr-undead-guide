import React, { useRef } from 'react';
import { useOffsetSearch } from '../hooks/useOffsetSearch';
import { DS3_OFFSET_PATTERNS } from '../lib/offsetPatterns';

interface OffsetSearchTabProps {
  onClose: () => void;
}

export const OffsetSearchTab: React.FC<OffsetSearchTabProps> = ({ onClose }) => {
  const {
    state,
    displayedOffsets,
    totalOffsets,
    DISPLAY_LIMIT,
    setFilePath,
    setCharacterSlot,
    setPatternId,
    setSelectedSnapshotId,
    initScan,
    filterSame,
    filterDifferent,
    filterDifferentFromAll,
    reset,
    exportCsv,
    importCsv,
  } = useOffsetSearch();

  const csvImportRef = useRef<HTMLInputElement>(null);

  const handleBrowse = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const path = await open({
        title: 'Open DS3 Save File',
        filters: [{ name: 'DS3 Save', extensions: ['sl2', 'co2'] }],
        multiple: false,
      });
      if (path && typeof path === 'string') setFilePath(path);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCsv = () => {
    const csv = exportCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'offset_search.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      if (text) importCsv(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const { snapshots, selectedSnapshotId, filePath, characterSlot, patternId, isLoading } = state;

  return (
    <div className="offset-search-page">
      <div className="offset-search-page-header">
        <span className="offset-search-title">DS3 Offset Search</span>
        <span className="offset-search-hint">Ctrl+Shift+O to toggle</span>
        <button className="offset-search-back" onClick={onClose}>← Back to Editor</button>
      </div>

      <div className="offset-search-body">
        {/* Controls row */}
        <div className="offset-search-controls">
          <div className="offset-search-control-group">
            <label>Save file</label>
            <div className="offset-search-file-row">
              <input
                type="text"
                readOnly
                value={filePath ?? ''}
                placeholder="No file selected"
                className="offset-search-filepath"
              />
              <button onClick={handleBrowse} disabled={isLoading}>Browse</button>
            </div>
          </div>

          <div className="offset-search-control-group">
            <label>Character slot</label>
            <select
              value={characterSlot}
              onChange={e => setCharacterSlot(Number(e.target.value))}
              disabled={isLoading}
            >
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i} value={i}>Slot {i}</option>
              ))}
            </select>
          </div>

          <div className="offset-search-control-group">
            <label>Pattern</label>
            <select
              value={patternId}
              onChange={e => setPatternId(e.target.value)}
              disabled={isLoading}
            >
              {DS3_OFFSET_PATTERNS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="offset-search-control-group offset-search-start-group">
            <button
              className="offset-search-btn-start"
              onClick={initScan}
              disabled={isLoading || !filePath}
            >
              {snapshots.length === 0 ? 'Start' : 'Reset & Start'}
            </button>
            {snapshots.length > 0 && (
              <button onClick={reset} disabled={isLoading} className="offset-search-btn-reset">
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="offset-search-status">{state.status}</div>

        {snapshots.length > 0 && (
          <>
            {/* Snapshots linked list */}
            <div className="offset-search-snapshots">
              <span className="offset-search-snapshots-label">Snapshots:</span>
              {snapshots.map(snap => (
                <button
                  key={snap.id}
                  className={`offset-search-snap-btn ${snap.id === selectedSnapshotId ? 'active' : ''}`}
                  onClick={() => setSelectedSnapshotId(snap.id)}
                >
                  {snap.id}
                </button>
              ))}
            </div>

            {/* Filter row */}
            <div className="offset-search-filter-row">
              <div className="offset-search-filter-select">
                <label>Compare with</label>
                <select
                  value={selectedSnapshotId ?? ''}
                  onChange={e => setSelectedSnapshotId(e.target.value)}
                  disabled={isLoading}
                >
                  {snapshots.map(snap => (
                    <option key={snap.id} value={snap.id}>{snap.id}</option>
                  ))}
                </select>
              </div>

              <button
                className="offset-search-btn offset-search-btn-same"
                onClick={filterSame}
                disabled={isLoading || !selectedSnapshotId}
              >
                Same
              </button>
              <button
                className="offset-search-btn offset-search-btn-diff"
                onClick={filterDifferent}
                disabled={isLoading || !selectedSnapshotId}
              >
                Different
              </button>
              <button
                className="offset-search-btn offset-search-btn-difall"
                onClick={filterDifferentFromAll}
                disabled={isLoading}
              >
                Different from All
              </button>
            </div>

            {/* CSV row */}
            <div className="offset-search-csv-row">
              <span className="offset-search-count">
                Showing {Math.min(totalOffsets, DISPLAY_LIMIT)} / {totalOffsets} offsets
                {totalOffsets > DISPLAY_LIMIT && ` (first ${DISPLAY_LIMIT} shown)`}
              </span>
              <button onClick={handleExportCsv} disabled={isLoading || totalOffsets === 0}>
                Export CSV
              </button>
              <button onClick={() => csvImportRef.current?.click()} disabled={isLoading}>
                Import CSV
              </button>
              <input
                ref={csvImportRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleImportCsv}
              />
            </div>

            {/* Table */}
            <div className="offset-search-table-wrapper">
              <table className="offset-search-table">
                <thead>
                  <tr>
                    <th>Offset</th>
                    {snapshots.map(snap => (
                      <th key={snap.id}>{snap.id}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedOffsets.map(rel => {
                    const offsetStr = rel < 0
                      ? `-0x${(-rel).toString(16).toUpperCase()}`
                      : `0x${rel.toString(16).toUpperCase()}`;
                    return (
                      <tr key={rel}>
                        <td className="offset-search-offset-cell">{offsetStr}</td>
                        {snapshots.map(snap => {
                          const v = snap.data[rel];
                          return (
                            <td key={snap.id} className="offset-search-value-cell">
                              {v !== undefined ? v.toString(16).toUpperCase().padStart(2, '0') : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
