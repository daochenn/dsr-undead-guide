import React from 'react';
import { DS3Character } from '../lib/Character';

interface CharacterListProps {
  characters: DS3Character[];
  selectedIndex: number | null;
  onSelectCharacter: (index: number) => void;
  isSlotActive: (slotIndex: number) => boolean;
}

export const CharacterList: React.FC<CharacterListProps> = ({
  characters,
  selectedIndex,
  onSelectCharacter,
  isSlotActive,
}) => {
  const activeCount = characters.filter((_, i) => isSlotActive(i)).length;

  return (
    <div className="character-list">
      <div className="char-list-header">
        <span className="char-list-title">Characters</span>
        <span className="char-list-count">{activeCount} / {characters.length}</span>
      </div>
      <div className="character-slots">
        {characters.map((char, index) => {
          const active = isSlotActive(index);
          const hasData = !char.isEmpty;
          const isDeleted = hasData && !active;
          const isClickable = hasData;

          return (
            <div
              key={index}
              className={`character-slot${char.isEmpty ? ' empty' : ''}${isDeleted ? ' deleted' : ''}${selectedIndex === index ? ' selected' : ''}`}
              onClick={() => isClickable && onSelectCharacter(index)}
            >
              <div className="character-name">
                {char.isEmpty
                  ? 'Empty Slot'
                  : (char.name || 'Unnamed')}
                {isDeleted && <span className="character-deleted-badge"> (Deleted)</span>}
              </div>
              <div className="character-level">
                {hasData ? `Lv ${char.level}` : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
