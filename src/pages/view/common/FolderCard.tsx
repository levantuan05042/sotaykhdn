import React from 'react';
import './FolderCard.css';

export type FolderKind = 'group' | 'category' | 'business';

const KIND_LABEL: Record<FolderKind, string> = {
  group: 'Nhóm sản phẩm',
  category: 'Danh mục',
  business: 'Nghiệp vụ',
};

const FolderIcon = () => (
  <svg className="folder-card-icon" viewBox="0 0 88 72" fill="none" aria-hidden="true">
    <path
      d="M6 18c0-3.3 2.7-6 6-6h18.2c1.5 0 2.9.7 3.8 1.8L38 20h38c3.3 0 6 2.7 6 6v32c0 3.3-2.7 6-6 6H12c-3.3 0-6-2.7-6-6V18Z"
      fill="#F6C945"
    />
    <path
      d="M4 30h80v26c0 4.4-3.6 8-8 8H12c-4.4 0-8-3.6-8-8V30Z"
      fill="#FFD54A"
    />
    <path
      d="M4 30h80v4H4v-4Z"
      fill="#FFE082"
    />
  </svg>
);

const FolderCard = ({
  name,
  kind,
  count,
  onClick,
}: {
  name: string;
  kind: FolderKind;
  count?: number;
  onClick: () => void;
}) => {
  const subtitle = typeof count === 'number' ? `${count} mục` : KIND_LABEL[kind];

  return (
    <button type="button" className="folder-card" onClick={onClick}>
      <div className="folder-card-icon-wrap">
        <FolderIcon />
      </div>
      <div className="folder-card-info">
        <h4 className="folder-card-title" title={name}>{name}</h4>
        <p className="folder-card-meta">{subtitle}</p>
      </div>
    </button>
  );
};

export default FolderCard;
