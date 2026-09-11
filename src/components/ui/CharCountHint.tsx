import React from 'react';
import './CharCountHint.css';

interface CharCountHintProps {
  current: number;
  max: number;
  error?: string | null;
}

export const CharCountHint: React.FC<CharCountHintProps> = ({ current, max, error }) => (
  <div className="field-meta">
    {error ? <p className="field-hint-error">{error}</p> : <span className="field-meta-spacer" />}
    <span className={`field-char-count ${current > max ? 'is-over' : ''}`}>
      {current}/{max}
    </span>
  </div>
);

export default CharCountHint;
