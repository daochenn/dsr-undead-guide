import React from 'react';
import { DS3Character } from '../lib/Character';

interface CharacterListProps {
  characters: DS3Character[];
  selectedIndex: number | null;
  onSelectCharacter: (index: number) => void;
}

export const CharacterList: React.FC<CharacterListProps> = ({
  characters,
  selectedIndex,
  onSelectCharacter
}) => {
  const nonEmpty = characters.filter(c => !c.isEmpty).length;

  return (
    <div className="character-list">
      <div className="char-list-header">
        <span className="char-list-title">Characters</span>
        <span className="char-list-count">{nonEmpty} / {characters.length}</span>
      </div>
      <div className="character-slots">
        {characters.map((char, index) => (
          <div
            key={index}
            className={`character-slot ${char.isEmpty ? 'empty' : ''} ${selectedIndex === index ? 'selected' : ''}`}
            onClick={() => !char.isEmpty && onSelectCharacter(index)}
          >
            <div className="character-name">
              {char.isEmpty ? 'Empty Slot' : char.name || 'Unnamed'}
            </div>
            <div className="character-level">
              {char.isEmpty ? '' : `Lv ${char.level}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
