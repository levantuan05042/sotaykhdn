import React, { useState } from 'react';
import './CollapsibleRightCard.css';

interface CollapsibleRightCardProps {
  title: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const CollapsibleRightCard: React.FC<CollapsibleRightCardProps> = ({
  title,
  className = '',
  defaultOpen = true,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`collapsible-right-card ${className}${open ? '' : ' is-collapsed'}`}>
      <button
        type="button"
        className="collapsible-right-card-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="collapsible-right-card-title">{title}</span>
        <svg
          className={`collapsible-right-card-chevron${open ? ' is-open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#595959"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="collapsible-right-card-body">{children}</div>}
    </div>
  );
};

export default CollapsibleRightCard;
