import React, { useRef, useState, useEffect, useCallback } from 'react';

export interface FilterScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const FilterScrollContainer: React.FC<FilterScrollContainerProps> = ({
  children,
  className = '',
  style = {},
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 2;
    setHasOverflow(overflow);
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        checkScroll();
      });
      ro.observe(el);
    }

    window.addEventListener('resize', checkScroll);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, children]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = 180;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(checkScroll, 250);
  };

  return (
    <div
      className={`filter-scroll-wrapper ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        minWidth: 0,
        position: 'relative',
        ...style,
      }}
    >
      <style>{`
        .filter-scroll-track::-webkit-scrollbar {
          display: none !important;
        }
      `}</style>

      {/* Nút lùi < */}
      {hasOverflow && (
        <button
          type="button"
          className="filter-scroll-btn filter-scroll-prev"
          onClick={() => handleScroll('left')}
          disabled={!canScrollLeft}
          aria-label="Cuộn bộ lọc sang trái"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            minWidth: '28px',
            borderRadius: '50%',
            border: '1px solid #D1D5DB',
            backgroundColor: '#FFFFFF',
            color: canScrollLeft ? '#171717' : '#D1D5DB',
            cursor: canScrollLeft ? 'pointer' : 'default',
            opacity: canScrollLeft ? 1 : 0.35,
            boxShadow: canScrollLeft ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            flexShrink: 0,
            marginRight: '8px',
            transition: 'all 0.15s ease',
          }}
          title="Xem các bộ lọc phía trước"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Khu vực chứa các dropdown bộ lọc */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="filter-scroll-track"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          flex: 1,
          minWidth: 0,
          scrollBehavior: 'smooth',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </div>

      {/* Dấu ... và Nút tiến > */}
      {hasOverflow && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            flexShrink: 0,
            marginLeft: '6px',
            gap: '4px',
          }}
        >
          {canScrollRight && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                color: '#737373',
                fontWeight: 700,
                fontSize: '15px',
                letterSpacing: '1.5px',
                userSelect: 'none',
                padding: '0 2px',
              }}
              title="Còn các bộ lọc tiếp theo"
            >
              ...
            </span>
          )}
          <button
            type="button"
            className="filter-scroll-btn filter-scroll-next"
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            aria-label="Cuộn bộ lọc sang phải"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              minWidth: '28px',
              borderRadius: '50%',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: canScrollRight ? '#171717' : '#D1D5DB',
              cursor: canScrollRight ? 'pointer' : 'default',
              opacity: canScrollRight ? 1 : 0.35,
              boxShadow: canScrollRight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            title="Xem các bộ lọc tiếp theo"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterScrollContainer;
