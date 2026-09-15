import React from 'react';
import './CharCountHint.css';

interface CharCountHintProps {
  current: number;
  /** Nếu không truyền: chỉ hiện số ký tự hiện tại (cột CLOB không giới hạn). */
  max?: number;
  error?: string | null;
}

export const CharCountHint: React.FC<CharCountHintProps> = ({ current, max, error }) => (
  <div className="field-meta">
    {error ? <p className="field-hint-error">{error}</p> : <span />}
    <span className={`field-char-count ${max != null && current > max ? 'is-over' : ''}`}>
      {max != null ? `${current}/${max}` : current}
    </span>
  </div>
);

export default CharCountHint;
