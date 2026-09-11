import React from 'react';

interface CriteriaRichBlockProps {
  label: string;
  value: string;
  isRequired?: boolean;
}

const formatContent = (val: string) => {
  if (!val) return '—';
  // If content is already HTML, return as is. If plain text, preserve newlines.
  if (/<[a-z][\s\S]*>/i.test(val)) {
    return val;
  }
  return val.replace(/\n/g, '<br/>');
};

export const CriteriaRichBlock: React.FC<CriteriaRichBlockProps> = ({
  label,
  value,
  isRequired = false,
}) => {
  const cleanLabel = label.replace(/\s*\(\*\)/g, '').trim();

  return (
    <div style={{ marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
      <label
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 700,
          color: '#1A191B',
          marginBottom: '8px',
        }}
      >
        {cleanLabel}{' '}
        {isRequired && <span style={{ color: '#AE1C3F' }}>(*)</span>}
      </label>

      <div
        style={{
          border: '1px solid #D1D5DB',
          borderRadius: '12px',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        }}
      >
        {/* Toolbar Header matching Design Image 1 */}
        <div
          style={{
            backgroundColor: '#F9FAFB',
            borderBottom: '1px solid #E5E7EB',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            userSelect: 'none',
          }}
        >
          {/* Text Style Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              title="In đậm"
              style={{
                fontWeight: 700,
                fontSize: '15px',
                color: '#374151',
                fontFamily: 'serif',
                cursor: 'default',
                width: '20px',
                textAlign: 'center',
              }}
            >
              B
            </span>
            <span
              title="In nghiêng"
              style={{
                fontStyle: 'italic',
                fontWeight: 600,
                fontSize: '15px',
                color: '#374151',
                fontFamily: 'serif',
                cursor: 'default',
                width: '20px',
                textAlign: 'center',
              }}
            >
              I
            </span>
            <span
              title="Gạch chân"
              style={{
                textDecoration: 'underline',
                fontWeight: 600,
                fontSize: '15px',
                color: '#374151',
                cursor: 'default',
                width: '20px',
                textAlign: 'center',
              }}
            >
              U
            </span>
          </div>

          <div
            style={{ width: '1px', height: '16px', backgroundColor: '#E5E7EB' }}
          />

          {/* Alignment / Paragraph Format Dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'default',
              padding: '2px 4px',
              borderRadius: '4px',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="15" y2="12" />
              <line x1="3" y1="18" x2="18" y2="18" />
            </svg>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>

          <div
            style={{ width: '1px', height: '16px', backgroundColor: '#E5E7EB' }}
          />

          {/* List and Indentation Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span title="Danh mục" style={{ color: '#374151', display: 'flex' }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </span>
            <span title="Giảm thụt lề" style={{ color: '#374151', display: 'flex' }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
            </span>
            <span title="Tăng thụt lề" style={{ color: '#374151', display: 'flex' }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="13 17 18 12 13 7" />
                <polyline points="6 17 11 12 6 7" />
              </svg>
            </span>
          </div>
        </div>

        {/* Content Body Area */}
        <div
          style={{
            padding: '16px 20px',
            fontSize: '14px',
            color: '#4B5563',
            lineHeight: '1.6',
            minHeight: '120px',
            wordBreak: 'break-word',
          }}
          dangerouslySetInnerHTML={{ __html: formatContent(value) }}
        />
      </div>
    </div>
  );
};

export default CriteriaRichBlock;
