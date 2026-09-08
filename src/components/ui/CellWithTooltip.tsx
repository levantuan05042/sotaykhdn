import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface CellWithTooltipProps {
  children?: React.ReactNode;
  text?: string | number | null;
  tooltip?: string | number | null;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const CellWithTooltip: React.FC<CellWithTooltipProps> = ({
  children,
  text,
  tooltip,
  className = '',
  style,
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const displayContent = children ?? (text !== undefined && text !== null && String(text).trim() !== '' ? String(text) : '---');
  
  let tooltipText = '';
  if (tooltip !== undefined && tooltip !== null) {
    tooltipText = String(tooltip);
  } else if (typeof text === 'string' || typeof text === 'number') {
    tooltipText = String(text);
  } else if (typeof displayContent === 'string' || typeof displayContent === 'number') {
    tooltipText = String(displayContent);
  }

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;

    // Nếu có children (như nút Xem chi tiết), đo chính xác phần tử nút/icon để căn giữa chuẩn xác
    const targetElement = containerRef.current.querySelector('button, a, svg') || containerRef.current.firstElementChild || containerRef.current;

    const rect = targetElement.getBoundingClientRect();

    // Nếu ô bị cuộn ra ngoài màn hình thì ẩn tooltip
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      setIsHovered(false);
      return;
    }

    const tooltipWidth = tooltipRef.current ? tooltipRef.current.offsetWidth : 100;
    const tooltipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : 32;

    const targetCenterX = rect.left + rect.width / 2;
    let left = targetCenterX - tooltipWidth / 2;

    if (left + tooltipWidth > window.innerWidth - 12) {
      left = window.innerWidth - tooltipWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    // Hiển thị ở dưới ô
    let top = rect.bottom + 6;
    if (top + tooltipHeight > window.innerHeight - 8 && rect.top > tooltipHeight + 12) {
      top = rect.top - tooltipHeight - 6;
    }

    setCoords(prev => {
      if (prev && Math.abs(prev.top - top) < 0.5 && Math.abs(prev.left - left) < 0.5) {
        return prev;
      }
      return { top, left };
    });
  }, []);

  const handleMouseEnter = () => {
    if (!tooltipText || tooltipText === '---') return;
    updatePosition();
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  useLayoutEffect(() => {
    if (isHovered) {
      updatePosition();
    }
  }, [isHovered, updatePosition]);

  useEffect(() => {
    if (!isHovered) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isHovered, updatePosition]);

  return (
    <div 
      ref={containerRef}
      className={`custom-tooltip-container ${className}`} 
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', ...style }}
    >
      <span 
        className="truncate-text" 
        style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: style?.justifyContent || 'flex-start' }}
      >
        {displayContent}
      </span>
      {isHovered && tooltipText && tooltipText !== '---' && coords && typeof document !== 'undefined' && createPortal(
        <div 
          ref={tooltipRef}
          className="custom-tooltip-portal"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 2147483647,
          }}
        >
          {tooltipText}
        </div>,
        document.body
      )}
    </div>
  );
};

export default CellWithTooltip;
