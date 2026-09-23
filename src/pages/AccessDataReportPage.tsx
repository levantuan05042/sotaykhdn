import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import {
  Calendar,
  Search,
  Archive,
  Info,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  X,
  BarChart2,
  Eye,
} from 'lucide-react';
import iconLen from '../assets/icon/len.svg';
import iconXuong from '../assets/icon/xuong.svg';
import { API_ENDPOINTS } from '../config/apiConfig';
import { useAdminAutoRefresh } from '../hooks/useAdminAutoRefresh';
import './AccessDataReportPage.css';

/* --------------------------------------------------------------------------
   Data Types
   -------------------------------------------------------------------------- */
export type MonthPoint = {
  month?: number;
  key?: string;
  label?: string;
  periodValue?: number;
  yearValue: number;
  compareValue?: number;
};

export type RankItem = {
  productId: string;
  productName: string;
  groupName?: string;
  categoryName?: string;
  businessName?: string;
  viewCount: number;
  savedCount: number;
  accessCount?: number;
  active?: boolean;
};

export type BranchItem = {
  rank?: number;
  branchCode: string;
  branchName?: string;
  viewCount: number;
  savedCount: number;
  accessCount?: number;
  userCount?: number;
};

export type UserItem = {
  rank?: number;
  userId: string;
  displayName?: string;
  branchCode?: string;
  branchName?: string;
  viewCount: number;
  savedCount: number;
  accessCount: number;
};

export type CompareMetric = {
  key: string;
  label: string;
  total: number;
  yearValue: number;
  compareValue?: number;
  delta?: number;
  growthPct?: number | null;
  unit?: string | null;
};

export type SuperGroupProductStat = {
  superGroup: string;
  name: string;
  activeCount: number;
  hiddenCount: number;
  totalCount: number;
};

export type ReportData = {
  periodType?: string;
  from?: string;
  to?: string;
  periodLabel?: string;
  year: number;
  compareYear: number;
  totalViews: number;
  totalSaves: number;
  productCount: number;
  productsWithViews: number;
  avgViewsPerProduct: number;
  viewsByMonth: MonthPoint[];
  savesByMonth: MonthPoint[];
  topByViews: RankItem[];
  topBySaves: RankItem[];
  products?: RankItem[];
  byBranch?: BranchItem[];
  byUser?: UserItem[];
  yearViews?: number;
  yearSaves?: number;
  activeBranchCount?: number;
  allYearsViews?: number;
  allYearsSaves?: number;
  allActiveUsers?: number;
  periodActiveUsers?: number;
  allAccessSessions?: number;
  periodAccessSessions?: number;
  compareAccessSessions?: number;
  compareYearViews?: number;
  compareYearSaves?: number;
  compareActiveUsers?: number;
  totalSystemBranches?: number;
  allYearsBranches?: number;
  compareMetrics?: CompareMetric[];
  activeProductCount?: number;
  inactiveProductCount?: number;
  totalGroups?: number;
  totalCategories?: number;
  totalBusinesses?: number;
  superGroupStats?: SuperGroupProductStat[];
};

const DEFAULT_BRANCH_NAMES: Record<string, string> = {
  '1050559': 'Ban Ngân Hàng Số',
  '1050048': 'Ban Khách hàng doanh nghiệp',
  '1050334': 'Ban Khách hàng cá nhân',
  '1050054': 'Chi nhánh Hà Nội 1',
  '1050323': 'Chi nhánh Hà Nội 2',
  '1050302': 'Chi nhánh Bắc Ninh',
  '1050323B': 'Chi nhánh Thường Tín',
  '1000': 'Hội sở chính',
  '1400': 'Hội sở Miền Nam',
  '1401': 'Chi nhánh Sài Gòn',
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const formatIsoDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const formatCompact = (n: number | undefined | null): string => {
  if (n === null || n === undefined || isNaN(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
};

const formatNumber = (n: number | undefined | null): string => {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Number(n).toLocaleString('vi-VN');
};

const pdfText = (s: string | undefined | null) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

/* --------------------------------------------------------------------------
   FIGMA COMPONENT 1: 12-Month Vertical Bar Chart
   -------------------------------------------------------------------------- */
/* --------------------------------------------------------------------------
   FIGMA COMPONENT 1: Monthly / Period Vertical Bar Chart
   -------------------------------------------------------------------------- */
const FigmaMonthlyBarChart: React.FC<{
  series?: MonthPoint[];
  periodType?: string;
  year?: number;
  onSelectMonth?: (month: number, year: number, value: number) => void;
}> = ({ series, year, onSelectMonth }) => {
  const chartData = useMemo(() => {
    const vals = new Array(12).fill(0);
    if (series && series.length > 0) {
      series.forEach((s) => {
        const m = s.month;
        const val = s.periodValue ?? s.yearValue ?? 0;
        if (m && m >= 1 && m <= 12) {
          vals[m - 1] = val;
        }
      });
    }

    return vals.map((v, i) => ({
      month: i + 1,
      label: `T${i + 1}`,
      value: v,
      display: v > 0 ? (v >= 10000 ? formatCompact(v) : v.toLocaleString('vi-VN')) : '',
    }));
  }, [series]);

  const maxVal = useMemo(() => {
    const v = chartData.map((d) => d.value);
    return Math.max(...v, 0);
  }, [chartData]);

  const { ceiling, yTicks } = useMemo(() => {
    if (maxVal <= 10) {
      return { ceiling: 10, yTicks: [10, 8, 6, 4, 2, 0] };
    }
    if (maxVal <= 50) {
      return { ceiling: 50, yTicks: [50, 40, 30, 20, 10, 0] };
    }
    if (maxVal <= 100) {
      return { ceiling: 100, yTicks: [100, 80, 60, 40, 20, 0] };
    }
    if (maxVal <= 500) {
      return { ceiling: 500, yTicks: [500, 400, 300, 200, 100, 0] };
    }
    if (maxVal <= 1000) {
      return { ceiling: 1000, yTicks: [1000, 800, 600, 400, 200, 0] };
    }
    if (maxVal <= 5000) {
      return { ceiling: 5000, yTicks: [5000, 4000, 3000, 2000, 1000, 0] };
    }
    const ceil = Math.ceil((maxVal * 1.2) / 1000) * 1000;
    const step = ceil / 6;
    const ticks = [
      ceil,
      Math.round(step * 5),
      Math.round(step * 4),
      Math.round(step * 3),
      Math.round(step * 2),
      Math.round(step),
      0,
    ];
    return { ceiling: ceil, yTicks: ticks };
  }, [maxVal]);

  const chartHeight = 185;
  const chartWidth = 620;
  const leftPad = 48;
  const bottomPad = 28;
  const topPad = 22;
  const rightPad = 15;
  const plotH = chartHeight - topPad;
  const plotW = chartWidth - leftPad - rightPad;

  return (
    <div className="figma-monthly-chart-wrap">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + bottomPad}`} preserveAspectRatio="xMidYMid meet">
        {/* Y Axis Gridlines & Labels */}
        {yTicks.map((tick, i) => {
          const y = topPad + plotH * (1 - tick / ceiling);
          return (
            <g key={i}>
              <line
                x1={leftPad}
                y1={y}
                x2={chartWidth - rightPad}
                y2={y}
                stroke="#F1F5F9"
                strokeWidth="1"
              />
              <text x={leftPad - 10} y={y + 3.5} textAnchor="end" fontSize="10.5" fill="#94A3B8">
                {tick === 0 ? '0' : tick >= 1000 ? `${tick / 1000}k` : String(tick)}
              </text>
            </g>
          );
        })}

        {/* Y-axis title */}
        <text
          x={-(topPad + plotH / 2)}
          y="14"
          transform="rotate(-90)"
          textAnchor="middle"
          fontSize="10.5"
          fill="#94A3B8"
        >
          Số lượt xem
        </text>

        {/* 12 Month Bars with click handlers */}
        {chartData.map((d, idx) => {
          const stepW = plotW / 12;
          const barW = 12;
          const x = leftPad + idx * stepW + (stepW - barW) / 2;
          const barH = d.value > 0 ? (d.value / ceiling) * plotH : 0;
          const y = topPad + plotH - barH;

          return (
            <g
              key={idx}
              className="figma-month-bar-group"
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectMonth?.(d.month, year || new Date().getFullYear(), d.value)}
            >
              {/* Invisible clickable column hit-box spanning the entire month slot */}
              <rect
                x={leftPad + idx * stepW}
                y={topPad}
                width={stepW}
                height={plotH + bottomPad}
                fill="transparent"
                className="figma-month-hitbox"
              />
              <title>{`Tháng ${d.month}/${year || new Date().getFullYear()}: ${d.value.toLocaleString('vi-VN')} lượt xem (Nhấn để xem chi tiết sản phẩm)`}</title>

              {d.value > 0 ? (
                <>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={barH}
                    fill="#1890FF"
                    rx="2"
                    ry="2"
                    className="figma-month-rect"
                  />
                  <text
                    x={x + barW / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="500"
                    fill="#64748B"
                  >
                    {d.display}
                  </text>
                </>
              ) : null}
              <text
                x={x + barW / 2}
                y={chartHeight + 14}
                textAnchor="middle"
                fontSize="11"
                fill="#94A3B8"
                className="figma-month-label"
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* X-axis title */}
        <text
          x={leftPad + plotW / 2}
          y={chartHeight + 26}
          textAnchor="middle"
          fontSize="10.5"
          fill="#94A3B8"
        >
          Tháng
        </text>
      </svg>
    </div>
  );
};

/* --------------------------------------------------------------------------
   POPUP MODAL: Month Product Views Detail
   -------------------------------------------------------------------------- */
interface MonthDetailModalProps {
  month: number;
  year: number;
  totalViews: number;
  loading: boolean;
  products: RankItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onClose: () => void;
}

const MonthDetailModal: React.FC<MonthDetailModalProps> = ({
  month,
  year,
  totalViews,
  loading,
  products,
  searchQuery,
  onSearchChange,
  onClose,
}) => {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter((p) => p.productName.toLowerCase().includes(q));
  }, [products, searchQuery]);

  const maxViews = useMemo(() => {
    if (products.length === 0) return 1;
    const v = products.map((p) => p.viewCount || 0);
    return Math.max(...v, 1);
  }, [products]);

  return (
    <div className="figma-modal-overlay" onClick={onClose}>
      <div className="figma-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="figma-modal-header">
          <div className="figma-modal-header-left">
            <div className="figma-modal-icon-wrap">
              <BarChart2 size={18} style={{ color: '#1890FF' }} />
            </div>
            <div>
              <h3 className="figma-modal-title">Chi tiết lượt xem theo sản phẩm</h3>
              <p className="figma-modal-subtitle">
                Tháng {month}/{year}
                <span className="figma-modal-dot">•</span>
                <span className="figma-modal-total-txt">Tổng {totalViews.toLocaleString('vi-VN')} lượt xem</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="figma-modal-close"
            onClick={onClose}
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="figma-modal-body">
          {/* Quick Stat Summary Cards */}
          <div className="figma-modal-stats-grid">
            <div className="figma-modal-stat-card">
              <span className="figma-modal-stat-label">Tổng lượt xem tháng</span>
              <div className="figma-modal-stat-val text-blue">
                <Eye size={16} />
                <span>{totalViews.toLocaleString('vi-VN')}</span>
              </div>
            </div>
            <div className="figma-modal-stat-card">
              <span className="figma-modal-stat-label">Số sản phẩm phát sinh lượt xem</span>
              <div className="figma-modal-stat-val text-slate">
                <span>{products.length}</span>
                <span className="figma-modal-stat-unit">sản phẩm</span>
              </div>
            </div>
          </div>

          {/* Search Box if products count > 2 */}
          {products.length > 2 ? (
            <div className="figma-modal-search">
              <Search size={14} style={{ color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên sản phẩm..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="figma-modal-clear-search"
                  onClick={() => onSearchChange('')}
                  title="Xóa tìm kiếm"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Loading or Content */}
          {loading ? (
            <div className="figma-modal-loading">
              <div className="figma-spin-spinner" />
              <span>Đang tải danh sách sản phẩm...</span>
            </div>
          ) : filtered.length > 0 ? (
            <div className="figma-modal-table-wrap">
              <table className="figma-modal-table">
                <thead>
                  <tr>
                    <th style={{ width: 68, textAlign: 'center' }}>Thứ hạng</th>
                    <th>Tên sản phẩm</th>
                    <th style={{ width: 150, textAlign: 'right' }}>Số lượt xem</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, idx) => {
                    const pct = maxViews > 0 ? Math.round(((p.viewCount || 0) / maxViews) * 100) : 0;
                    return (
                      <tr key={p.productId || idx}>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className={`figma-rank-badge ${
                              idx === 0
                                ? 'gold'
                                : idx === 1
                                ? 'silver'
                                : idx === 2
                                ? 'bronze'
                                : 'neutral'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td>
                          <span className="figma-modal-prod-title" title={p.productName}>
                            {p.productName}
                          </span>
                        </td>
                        <td>
                          <div className="figma-modal-views-cell">
                            <span className="figma-modal-views-num">
                              {p.viewCount.toLocaleString('vi-VN')}
                            </span>
                            <div className="figma-modal-bar-track">
                              <div
                                className="figma-modal-bar-fill"
                                style={{ width: `${Math.max(pct, 6)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="figma-modal-empty">
              <div className="figma-modal-empty-icon">
                <EyeOff size={28} />
              </div>
              <p className="figma-modal-empty-title">
                {products.length === 0
                  ? `Tháng ${month}/${year} không có sản phẩm nào được xem`
                  : 'Không tìm thấy sản phẩm phù hợp'}
              </p>
              <p className="figma-modal-empty-sub">
                {products.length === 0
                  ? 'Chưa ghi nhận lượt xem trong khoảng thời gian này.'
                  : 'Vui lòng thử tìm kiếm lại với từ khóa khác.'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="figma-modal-footer">
          <span className="figma-modal-footer-info">
            {!loading && filtered.length > 0 ? `Hiển thị ${filtered.length} sản phẩm` : ''}
          </span>
          <button type="button" className="figma-modal-btn-close" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

/* --------------------------------------------------------------------------
   FIGMA COMPONENT 2: Horizontal Ranking Bars (Mint Green, Pink, Blue)
   -------------------------------------------------------------------------- */
const FigmaHorizontalBarChart: React.FC<{
  items: Array<{ label: string; value: number }>;
  theme: 'green' | 'pink' | 'blue';
}> = ({ items, theme }) => {
  const max = useMemo(() => {
    const vals = items.map((i) => i.value);
    return Math.max(...vals, 1);
  }, [items]);

  if (!items || items.length === 0) {
    return (
      <div className="figma-empty-state">
        <span>Không có dữ liệu trong khoảng thời gian này</span>
      </div>
    );
  }

  return (
    <div className="figma-hbar-list">
      {items.map((item, idx) => {
        const pct = item.value > 0 ? Math.min(100, Math.max(6, (item.value / max) * 100)) : 0;
        return (
          <div className="figma-hbar-row" key={idx}>
            <span className="figma-hbar-label" title={item.label}>
              {item.label}
            </span>
            <div className="figma-hbar-track">
              <div
                className={`figma-hbar-fill ${theme}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="figma-hbar-val">{item.value.toLocaleString('vi-VN')}</span>
          </div>
        );
      })}
    </div>
  );
};

/* --------------------------------------------------------------------------
   FIGMA COMPONENT 3: Semi-Circle Gauge (Branch Activity Ratio)
   -------------------------------------------------------------------------- */
const FigmaSemiCircleGauge: React.FC<{
  percentage: number;
  activeCount: number;
  totalCount: number;
  hasData?: boolean;
}> = ({ percentage, activeCount, totalCount, hasData = true }) => {
  const r = 85;
  const cx = 140;
  const cy = 112;
  const strokeW = 22;
  const arcLength = Math.PI * r;
  const clampedPct = Math.min(100, Math.max(0, isNaN(percentage) ? 0 : percentage));
  const progressOffset = arcLength * (1 - clampedPct / 100);

  return (
    <div className="figma-gauge-box">
      <svg width="280" height="135" viewBox="0 0 280 135">
        {/* Background Arc - Flat Ends (no round caps) */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeW}
          strokeLinecap="butt"
        />
        {/* Progress Arc - Flat Ends (no round caps) */}
        {hasData && clampedPct > 0 ? (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="#A8071A"
            strokeWidth={strokeW}
            strokeLinecap="butt"
            strokeDasharray={arcLength}
            strokeDashoffset={progressOffset}
          />
        ) : null}
        {/* Center Percentage */}
        <text
          x={cx}
          y={cy - 26}
          textAnchor="middle"
          fontSize="34"
          fontWeight="700"
          fill="#1E293B"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        >
          {hasData ? `${clampedPct.toFixed(1)}%` : '--'}
        </text>
        {/* Subtext inside Arch */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize="12"
          fontWeight="500"
          fill="#64748B"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        >
          {hasData
            ? `${activeCount.toLocaleString('vi-VN')}/${totalCount.toLocaleString('vi-VN')} chi nhánh`
            : '--/-- chi nhánh'}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontSize="11"
          fill="#94A3B8"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        >
          đã phát sinh truy cập trong kỳ
        </text>
      </svg>
    </div>
  );
};

/* --------------------------------------------------------------------------
   FIGMA COMPONENT 4: Donut Chart (Active vs Inactive Users)
   -------------------------------------------------------------------------- */
const FigmaUserActivityDonut: React.FC<{
  activeUsers: number;
  inactiveUsers: number;
  hasData?: boolean;
}> = ({ activeUsers, inactiveUsers, hasData = true }) => {
  const total = activeUsers + inactiveUsers;
  const r = 62;
  const cx = 85;
  const cy = 85;
  const strokeW = 22;
  const circ = 2 * Math.PI * r;

  const valid = Boolean(hasData && total > 0);
  const activeFraction = valid && total > 0 ? activeUsers / total : 0;
  const activeLength = circ * activeFraction;
  const activePctVal = Math.round(activeFraction * 100);

  // Dynamic arc label coordinates strictly from 12 o'clock (-90 deg) clockwise
  const hasActiveLabel = valid && activeUsers > 0 && activeFraction >= 0.06;
  const activeMidAngle = -90 + (activeFraction * 360) / 2;
  const activeRad = (activeMidAngle * Math.PI) / 180;
  const activeX = cx + r * Math.cos(activeRad);
  const activeY = cy + r * Math.sin(activeRad) + 3.5;

  const hasInactiveLabel = valid && inactiveUsers > 0 && (1 - activeFraction) >= 0.06;
  const inactiveMidAngle = -90 + activeFraction * 360 + ((1 - activeFraction) * 360) / 2;
  const inactiveRad = (inactiveMidAngle * Math.PI) / 180;
  const inactiveX = cx + r * Math.cos(inactiveRad);
  const inactiveY = cy + r * Math.sin(inactiveRad) + 3.5;

  return (
    <div className="figma-donut-box">
      <svg width="170" height="170" viewBox="0 0 170 170">
        {/* Inactive Arc (Gray) */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={valid ? '#CBD5E1' : '#E2E8F0'}
          strokeWidth={strokeW}
        >
          <title>{valid ? `Không hoạt động: ${100 - activePctVal}% (${inactiveUsers.toLocaleString('vi-VN')})` : 'Không hoạt động'}</title>
        </circle>
        {/* Active Arc (Agribank Red) starting at 12 o'clock */}
        {valid && activeFraction > 0 ? (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#A8071A"
            strokeWidth={strokeW}
            strokeDasharray={`${activeLength} ${circ}`}
            strokeDashoffset={0}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          >
            <title>{`Đang hoạt động: ${activePctVal}% (${activeUsers.toLocaleString('vi-VN')})`}</title>
          </circle>
        ) : null}

        {/* Small Inactive Count inside Gray Arc - only rendered when inactive > 0 */}
        {hasInactiveLabel ? (
          <text
            x={inactiveX}
            y={inactiveY}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill="#64748B"
          >
            {inactiveUsers.toLocaleString('vi-VN')}
          </text>
        ) : null}

        {/* Active Count inside Red Arc */}
        {hasActiveLabel ? (
          <text
            x={activeX}
            y={activeY}
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="#FFFFFF"
          >
            {activeUsers.toLocaleString('vi-VN')}
          </text>
        ) : null}

        {/* Big Center Percentage in Red */}
        {valid ? (
          <text
            x={cx}
            y={cy + 8}
            textAnchor="middle"
            fill="#A8071A"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            <tspan fontSize="28" fontWeight="700">{activePctVal}</tspan>
            <tspan fontSize="18" fontWeight="500" dx="3">%</tspan>
          </text>
        ) : (
          <text
            x={cx}
            y={cy + 8}
            textAnchor="middle"
            fontSize="26"
            fontWeight="700"
            fill="#A8071A"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            --
          </text>
        )}
      </svg>

      <div className="figma-donut-legend">
        <div className="figma-legend-item">
          <span className="figma-legend-dot red" />
          <span>Đang hoạt động</span>
        </div>
        <div className="figma-legend-item">
          <span className="figma-legend-dot gray" />
          <span>Không hoạt động</span>
        </div>
      </div>
    </div>
  );
};

/* --------------------------------------------------------------------------
   FIGMA COMPONENT 4B: Donut Chart (Active vs Inactive Products)
   -------------------------------------------------------------------------- */
const FigmaProductActivityDonut: React.FC<{
  activeProducts: number;
  inactiveProducts: number;
  hasData?: boolean;
}> = ({ activeProducts, inactiveProducts, hasData = true }) => {
  const total = activeProducts + inactiveProducts;
  const r = 62;
  const cx = 85;
  const cy = 85;
  const strokeW = 22;
  const circ = 2 * Math.PI * r;

  const valid = Boolean(hasData && total > 0);
  const activeFraction = valid && total > 0 ? activeProducts / total : 0;
  const activeLength = circ * activeFraction;
  const activePctVal = Math.round(activeFraction * 100);

  // Dynamic arc label coordinates strictly from 12 o'clock (-90 deg) clockwise
  const hasActiveLabel = valid && activeProducts > 0 && activeFraction >= 0.06;
  const activeMidAngle = -90 + (activeFraction * 360) / 2;
  const activeRad = (activeMidAngle * Math.PI) / 180;
  const activeX = cx + r * Math.cos(activeRad);
  const activeY = cy + r * Math.sin(activeRad) + 3.5;

  const hasInactiveLabel = valid && inactiveProducts > 0 && (1 - activeFraction) >= 0.06;
  const inactiveMidAngle = -90 + activeFraction * 360 + ((1 - activeFraction) * 360) / 2;
  const inactiveRad = (inactiveMidAngle * Math.PI) / 180;
  const inactiveX = cx + r * Math.cos(inactiveRad);
  const inactiveY = cy + r * Math.sin(inactiveRad) + 3.5;

  return (
    <div className="figma-donut-box">
      <svg width="170" height="170" viewBox="0 0 170 170">
        {/* Inactive Arc (Gray) */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={valid ? '#CBD5E1' : '#E2E8F0'}
          strokeWidth={strokeW}
        >
          <title>{valid ? `Không hoạt động: ${100 - activePctVal}% (${inactiveProducts.toLocaleString('vi-VN')})` : 'Không hoạt động'}</title>
        </circle>
        {/* Active Arc (Agribank Red) starting at 12 o'clock */}
        {valid && activeFraction > 0 ? (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#A8071A"
            strokeWidth={strokeW}
            strokeDasharray={`${activeLength} ${circ}`}
            strokeDashoffset={0}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          >
            <title>{`Đang hoạt động: ${activePctVal}% (${activeProducts.toLocaleString('vi-VN')})`}</title>
          </circle>
        ) : null}

        {/* Small Inactive Count inside Gray Arc - only rendered when inactive > 0 */}
        {hasInactiveLabel ? (
          <text
            x={inactiveX}
            y={inactiveY}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill="#64748B"
          >
            {inactiveProducts.toLocaleString('vi-VN')}
          </text>
        ) : null}

        {/* Active Count inside Bottom Red Arc */}
        {hasActiveLabel ? (
          <text
            x={activeX}
            y={activeY}
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="#FFFFFF"
          >
            {activeProducts.toLocaleString('vi-VN')}
          </text>
        ) : null}

        {/* Big Center Percentage in Red */}
        {valid ? (
          <text
            x={cx}
            y={cy + 8}
            textAnchor="middle"
            fill="#A8071A"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            <tspan fontSize="28" fontWeight="700">{activePctVal}</tspan>
            <tspan fontSize="18" fontWeight="500" dx="3">%</tspan>
          </text>
        ) : (
          <text
            x={cx}
            y={cy + 8}
            textAnchor="middle"
            fontSize="26"
            fontWeight="700"
            fill="#A8071A"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            --
          </text>
        )}
      </svg>

      <div className="figma-donut-legend">
        <div className="figma-legend-item">
          <span className="figma-legend-dot red" />
          <span>Đang hoạt động</span>
        </div>
        <div className="figma-legend-item">
          <span className="figma-legend-dot gray" />
          <span>Không hoạt động</span>
        </div>
      </div>
    </div>
  );
};

/* --------------------------------------------------------------------------
   FIGMA COMPONENT: Dual-Month Range Calendar Picker (Matching Figma Spec)
   -------------------------------------------------------------------------- */
export type PresetKey =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'all_time'
  | 'custom';

export interface DateFilterRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  compareFrom: string; // YYYY-MM-DD
  compareTo: string; // YYYY-MM-DD
  periodType: 'DAY' | 'MONTH' | 'YEAR';
  label: string;
  presetKey: PresetKey;
  compareLabel?: string;
}

const PRESET_OPTIONS: Array<{ key: PresetKey; label: string }> = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua' },
  { key: 'this_week', label: 'Tuần này' },
  { key: 'last_week', label: 'Tuần trước' },
  { key: 'this_month', label: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước' },
  { key: 'this_year', label: 'Năm nay' },
  { key: 'last_year', label: 'Năm trước' },
  { key: 'all_time', label: 'Toàn bộ thời gian' },
];

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

const IconDoubleChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="11 17 6 12 11 7" />
    <polyline points="18 17 13 12 18 7" />
  </svg>
);

const IconDoubleChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="13 17 18 12 13 7" />
    <polyline points="6 17 11 12 6 7" />
  </svg>
);

export const formatCompareDateLabel = (
  fromStr: string | undefined,
  toStr: string | undefined,
  periodType: 'DAY' | 'MONTH' | 'YEAR' | string = 'DAY'
): string => {
  if (!fromStr || !toStr) return '';
  const partsF = fromStr.split('-').map(Number);
  const partsT = toStr.split('-').map(Number);
  if (partsF.length !== 3 || partsT.length !== 3) return '';

  const [y1, m1, d1] = partsF;
  const [y2, m2, d2] = partsT;

  const d1Str = `${pad2(d1)}/${pad2(m1)}/${y1}`;
  const d2Str = `${pad2(d2)}/${pad2(m2)}/${y2}`;

  if (periodType === 'YEAR') {
    if (y1 === y2) return `năm ${y1}`;
    return `năm ${y1} - ${y2}`;
  }

  if (periodType === 'MONTH') {
    if (y1 === y2 && m1 === m2) {
      return `tháng ${pad2(m1)}/${y1}`;
    }
    if (y1 === y2) {
      return `tháng ${pad2(m1)} - ${pad2(m2)}/${y1}`;
    }
    return `tháng ${pad2(m1)}/${y1} - ${pad2(m2)}/${y2}`;
  }

  // periodType === 'DAY'
  if (fromStr === toStr) {
    return d1Str;
  }
  return `${d1Str} - ${d2Str}`;
};

const getPresetRange = (preset: PresetKey): DateFilterRange => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const cmpFrom = formatIsoDate(yesterday);
      const cmpTo = formatIsoDate(yesterday);
      return {
        from: formatIsoDate(today),
        to: formatIsoDate(today),
        compareFrom: cmpFrom,
        compareTo: cmpTo,
        periodType: 'DAY',
        label: 'Hôm nay',
        compareLabel: formatCompareDateLabel(cmpFrom, cmpTo, 'DAY'),
        presetKey: 'today',
      };
    }
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBeforeYesterday = new Date(today);
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
      const cmpFrom = formatIsoDate(dayBeforeYesterday);
      const cmpTo = formatIsoDate(dayBeforeYesterday);
      return {
        from: formatIsoDate(yesterday),
        to: formatIsoDate(yesterday),
        compareFrom: cmpFrom,
        compareTo: cmpTo,
        periodType: 'DAY',
        label: 'Hôm qua',
        compareLabel: formatCompareDateLabel(cmpFrom, cmpTo, 'DAY'),
        presetKey: 'yesterday',
      };
    }
    case 'this_week': {
      const dayOfWeek = today.getDay();
      const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monThisWeek = new Date(today);
      monThisWeek.setDate(monThisWeek.getDate() - diffToMon);
      const sunThisWeek = new Date(monThisWeek);
      sunThisWeek.setDate(sunThisWeek.getDate() + 6);

      const monLastWeek = new Date(monThisWeek);
      monLastWeek.setDate(monLastWeek.getDate() - 7);
      const sunLastWeek = new Date(sunThisWeek);
      sunLastWeek.setDate(sunLastWeek.getDate() - 7);
      const cmpFrom = formatIsoDate(monLastWeek);
      const cmpTo = formatIsoDate(sunLastWeek);

      return {
        from: formatIsoDate(monThisWeek),
        to: formatIsoDate(sunThisWeek),
        compareFrom: cmpFrom,
        compareTo: cmpTo,
        periodType: 'DAY',
        label: 'Tuần này',
        compareLabel: formatCompareDateLabel(cmpFrom, cmpTo, 'DAY'),
        presetKey: 'this_week',
      };
    }
    case 'last_week': {
      const dayOfWeek = today.getDay();
      const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monThisWeek = new Date(today);
      monThisWeek.setDate(monThisWeek.getDate() - diffToMon);

      const monLastWeek = new Date(monThisWeek);
      monLastWeek.setDate(monLastWeek.getDate() - 7);
      const sunLastWeek = new Date(monThisWeek);
      sunLastWeek.setDate(sunLastWeek.getDate() - 1);

      const monTwoWeeksAgo = new Date(monLastWeek);
      monTwoWeeksAgo.setDate(monTwoWeeksAgo.getDate() - 7);
      const sunTwoWeeksAgo = new Date(sunLastWeek);
      sunTwoWeeksAgo.setDate(sunTwoWeeksAgo.getDate() - 7);
      const cmpFrom = formatIsoDate(monTwoWeeksAgo);
      const cmpTo = formatIsoDate(sunTwoWeeksAgo);

      return {
        from: formatIsoDate(monLastWeek),
        to: formatIsoDate(sunLastWeek),
        compareFrom: cmpFrom,
        compareTo: cmpTo,
        periodType: 'DAY',
        label: 'Tuần trước',
        compareLabel: formatCompareDateLabel(cmpFrom, cmpTo, 'DAY'),
        presetKey: 'last_week',
      };
    }
    case 'this_month': {
      const firstThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const firstLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      const cmpFrom = formatIsoDate(firstLastMonth);
      const cmpTo = formatIsoDate(lastLastMonth);

      return {
        from: formatIsoDate(firstThisMonth),
        to: formatIsoDate(lastThisMonth),
        compareFrom: cmpFrom,
        compareTo: cmpTo,
        periodType: 'MONTH',
        label: 'Tháng này',
        compareLabel: formatCompareDateLabel(cmpFrom, cmpTo, 'MONTH'),
        presetKey: 'this_month',
      };
    }
    case 'last_month': {
      const firstLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

      const firstTwoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const lastTwoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 1, 0);
      const cmpFrom = formatIsoDate(firstTwoMonthsAgo);
      const cmpTo = formatIsoDate(lastTwoMonthsAgo);

      return {
        from: formatIsoDate(firstLastMonth),
        to: formatIsoDate(lastLastMonth),
        compareFrom: cmpFrom,
        compareTo: cmpTo,
        periodType: 'MONTH',
        label: 'Tháng trước',
        compareLabel: formatCompareDateLabel(cmpFrom, cmpTo, 'MONTH'),
        presetKey: 'last_month',
      };
    }
    case 'this_year': {
      const y = today.getFullYear();
      const firstThisYear = new Date(y, 0, 1);
      const lastThisYear = new Date(y, 11, 31);

      const firstLastYear = new Date(y - 1, 0, 1);
      const lastLastYear = new Date(y - 1, 11, 31);
      const cmpFrom = formatIsoDate(firstLastYear);
      const cmpTo = formatIsoDate(lastLastYear);

      return {
        from: formatIsoDate(firstThisYear),
        to: formatIsoDate(lastThisYear),
        compareFrom: cmpFrom,
        compareTo: cmpTo,
        periodType: 'YEAR',
        label: 'Năm nay',
        compareLabel: formatCompareDateLabel(cmpFrom, cmpTo, 'YEAR'),
        presetKey: 'this_year',
      };
    }
    case 'last_year': {
      const y = today.getFullYear() - 1;
      const firstLastYear = new Date(y, 0, 1);
      const lastLastYear = new Date(y, 11, 31);

      const firstTwoYearsAgo = new Date(y - 1, 0, 1);
      const lastTwoYearsAgo = new Date(y - 1, 11, 31);
      const cmpFrom = formatIsoDate(firstTwoYearsAgo);
      const cmpTo = formatIsoDate(lastTwoYearsAgo);

      return {
        from: formatIsoDate(firstLastYear),
        to: formatIsoDate(lastLastYear),
        compareFrom: cmpFrom,
        compareTo: cmpTo,
        periodType: 'YEAR',
        label: 'Năm trước',
        compareLabel: formatCompareDateLabel(cmpFrom, cmpTo, 'YEAR'),
        presetKey: 'last_year',
      };
    }
    case 'all_time': {
      const startAllTime = new Date(2020, 0, 1);
      return {
        from: formatIsoDate(startAllTime),
        to: formatIsoDate(today),
        compareFrom: '',
        compareTo: '',
        periodType: 'DAY',
        label: 'Toàn bộ thời gian',
        compareLabel: '',
        presetKey: 'all_time',
      };
    }
    default:
      return getPresetRange('today');
  }
};

const computeCustomDateRange = (startDate: Date, endDate: Date): DateFilterRange => {
  // Normalize dates so actualStart <= actualEnd regardless of click order
  const [actualStart, actualEnd] =
    startDate.getTime() <= endDate.getTime()
      ? [startDate, endDate]
      : [endDate, startDate];

  const dStart = new Date(actualStart.getFullYear(), actualStart.getMonth(), actualStart.getDate());
  const dEnd = new Date(actualEnd.getFullYear(), actualEnd.getMonth(), actualEnd.getDate());

  const sYear = dStart.getFullYear();
  const sMonth = dStart.getMonth();
  const sDate = dStart.getDate();

  const eYear = dEnd.getFullYear();
  const eMonth = dEnd.getMonth();
  const eDate = dEnd.getDate();

  const isStartFirstOfMonth = sDate === 1;
  const isEndLastOfMonth = eDate === new Date(eYear, eMonth + 1, 0).getDate();

  const formatVn = (d: Date) =>
    `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

  // Case 1: Full Calendar Year(s) (Jan 1 to Dec 31)
  if (isStartFirstOfMonth && isEndLastOfMonth && sMonth === 0 && eMonth === 11) {
    const yearCount = eYear - sYear + 1;
    const cmpStartYear = sYear - yearCount;
    const cmpEndYear = sYear - 1;
    const cmpFrom = new Date(cmpStartYear, 0, 1);
    const cmpTo = new Date(cmpEndYear, 11, 31);
    const label = yearCount === 1 ? `Năm ${sYear}` : `Từ ${sYear} đến ${eYear}`;
    const compareLabel = yearCount === 1 ? `năm ${cmpStartYear}` : `từ ${cmpStartYear} đến ${cmpEndYear}`;
    return {
      from: formatIsoDate(dStart),
      to: formatIsoDate(dEnd),
      compareFrom: formatIsoDate(cmpFrom),
      compareTo: formatIsoDate(cmpTo),
      periodType: 'YEAR',
      label,
      compareLabel,
      presetKey: 'custom',
    };
  }

  // Case 2: Full Calendar Month(s) (e.g. Tháng 3 -> Tháng 2; Tháng 3 đến 4 -> Tháng 1 đến 2)
  if (isStartFirstOfMonth && isEndLastOfMonth) {
    const monthCount = (eYear - sYear) * 12 + (eMonth - sMonth) + 1;
    const cmpEnd = new Date(sYear, sMonth, 0); // Last day of month prior to sMonth
    const cmpStart = new Date(sYear, sMonth - monthCount, 1); // First day of start month

    const label =
      monthCount === 1
        ? `Tháng ${sMonth + 1}/${sYear}`
        : sYear === eYear
        ? `Tháng ${sMonth + 1} - Tháng ${eMonth + 1}/${sYear}`
        : `Tháng ${sMonth + 1}/${sYear} - Tháng ${eMonth + 1}/${eYear}`;

    const compareLabel =
      monthCount === 1
        ? `tháng ${cmpStart.getMonth() + 1}/${cmpStart.getFullYear()}`
        : cmpStart.getFullYear() === cmpEnd.getFullYear()
        ? `tháng ${cmpStart.getMonth() + 1} - ${cmpEnd.getMonth() + 1}/${cmpStart.getFullYear()}`
        : `tháng ${cmpStart.getMonth() + 1}/${cmpStart.getFullYear()} - ${cmpEnd.getMonth() + 1}/${cmpEnd.getFullYear()}`;

    return {
      from: formatIsoDate(dStart),
      to: formatIsoDate(dEnd),
      compareFrom: formatIsoDate(cmpStart),
      compareTo: formatIsoDate(cmpEnd),
      periodType: 'MONTH',
      label,
      compareLabel,
      presetKey: 'custom',
    };
  }

  // Case 3: Single day
  if (dStart.getTime() === dEnd.getTime()) {
    const cmpDate = new Date(dStart);
    cmpDate.setDate(cmpDate.getDate() - 1);
    return {
      from: formatIsoDate(dStart),
      to: formatIsoDate(dEnd),
      compareFrom: formatIsoDate(cmpDate),
      compareTo: formatIsoDate(cmpDate),
      periodType: 'DAY',
      label: `Ngày ${formatVn(dStart)}`,
      compareLabel: `ngày ${formatVn(cmpDate)}`,
      presetKey: 'custom',
    };
  }

  // Case 4: Arbitrary N days
  const diffDays = Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const cmpEnd = new Date(dStart);
  cmpEnd.setDate(cmpEnd.getDate() - 1);
  const cmpStart = new Date(cmpEnd);
  cmpStart.setDate(cmpStart.getDate() - diffDays + 1);

  return {
    from: formatIsoDate(dStart),
    to: formatIsoDate(dEnd),
    compareFrom: formatIsoDate(cmpStart),
    compareTo: formatIsoDate(cmpEnd),
    periodType: 'DAY',
    label: `${formatVn(dStart)} - ${formatVn(dEnd)}`,
    compareLabel: `${formatVn(cmpStart)} - ${formatVn(cmpEnd)}`,
    presetKey: 'custom',
  };
};

const calcGrowthPct = (
  current: number,
  previous: number
): { pct: number; absPctText: string; isPositive: boolean; isZero: boolean } => {
  if (previous <= 0) {
    if (current > 0) {
      return { pct: 100, absPctText: '100%', isPositive: true, isZero: false };
    }
    return { pct: 0, absPctText: '0%', isPositive: true, isZero: true };
  }
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 1000) / 10;
  const absPct = Math.abs(pct);
  const absPctText = `${absPct.toFixed(1).replace(/\.0$/, '')}%`;
  if (pct > 0) {
    return { pct, absPctText, isPositive: true, isZero: false };
  } else if (pct < 0) {
    return { pct, absPctText, isPositive: false, isZero: false };
  }
  return { pct: 0, absPctText: '0%', isPositive: true, isZero: true };
};

const DualMonthRangePicker: React.FC<{
  currentRange: DateFilterRange;
  onApply: (range: DateFilterRange) => void;
  onCancel: () => void;
}> = ({ currentRange, onApply, onCancel }) => {
  const parseDate = (dStr: string) => {
    if (!dStr) return new Date();
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const [selectedPreset, setSelectedPreset] = useState<PresetKey>(currentRange.presetKey);
  const [startDate, setStartDate] = useState<Date | null>(() => parseDate(currentRange.from));
  const [endDate, setEndDate] = useState<Date | null>(() => parseDate(currentRange.to));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const initS = startDate || new Date();
  const [y1, setY1] = useState<number>(initS.getFullYear());
  const [m1, setM1] = useState<number>(initS.getMonth());
  const [viewMode1, setViewMode1] = useState<'day' | 'month' | 'year'>('day');

  const [y2, setY2] = useState<number>(() => {
    if (endDate && (endDate.getFullYear() !== initS.getFullYear() || endDate.getMonth() !== initS.getMonth())) {
      return endDate.getFullYear();
    }
    return initS.getMonth() === 11 ? initS.getFullYear() + 1 : initS.getFullYear();
  });
  const [m2, setM2] = useState<number>(() => {
    if (endDate && (endDate.getFullYear() !== initS.getFullYear() || endDate.getMonth() !== initS.getMonth())) {
      return endDate.getMonth();
    }
    return (initS.getMonth() + 1) % 12;
  });
  const [viewMode2, setViewMode2] = useState<'day' | 'month' | 'year'>('day');

  const formatVnDate = (d: Date | null) => {
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const isSameDay = (d1: Date | null, d2: Date | null) => {
    if (!d1 || !d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isDateInRange = (d: Date) => {
    const time = d.getTime();
    if (startDate && endDate) {
      const s = Math.min(startDate.getTime(), endDate.getTime());
      const e = Math.max(startDate.getTime(), endDate.getTime());
      return time > s && time < e;
    }
    if (startDate && !endDate && hoverDate) {
      const s = Math.min(startDate.getTime(), hoverDate.getTime());
      const e = Math.max(startDate.getTime(), hoverDate.getTime());
      return time > s && time < e;
    }
    return false;
  };

  const handleDateClick = (d: Date) => {
    setSelectedPreset('custom');
    if (!startDate || (startDate && endDate)) {
      setStartDate(d);
      setEndDate(null);
    } else {
      if (d < startDate) {
        setEndDate(startDate);
        setStartDate(d);
      } else {
        setEndDate(d);
      }
    }
  };

  const handlePresetClick = (key: PresetKey) => {
    setSelectedPreset(key);
    const range = getPresetRange(key);
    const s = parseDate(range.from);
    const e = parseDate(range.to);
    setStartDate(s);
    setEndDate(e);
    setY1(s.getFullYear());
    setM1(s.getMonth());
    const nextM = s.getMonth() === 11 ? 0 : s.getMonth() + 1;
    const nextY = s.getMonth() === 11 ? s.getFullYear() + 1 : s.getFullYear();
    setY2(nextY);
    setM2(nextM);
    setViewMode1('day');
    setViewMode2('day');
  };

  const handleSave = () => {
    if (!startDate) return;
    const finalEnd = endDate || startDate;
    if (selectedPreset !== 'custom') {
      onApply(getPresetRange(selectedPreset));
    } else {
      onApply(computeCustomDateRange(startDate, finalEnd));
    }
  };

  const prevMonth1 = () => {
    if (m1 === 0) {
      setM1(11);
      setY1((y) => y - 1);
    } else {
      setM1((m) => m - 1);
    }
  };
  const nextMonth1 = () => {
    if (m1 === 11) {
      setM1(0);
      setY1((y) => y + 1);
    } else {
      setM1((m) => m + 1);
    }
  };

  const prevMonth2 = () => {
    if (m2 === 0) {
      setM2(11);
      setY2((y) => y - 1);
    } else {
      setM2((m) => m - 1);
    }
  };
  const nextMonth2 = () => {
    if (m2 === 11) {
      setM2(0);
      setY2((y) => y + 1);
    } else {
      setM2((m) => m + 1);
    }
  };

  const renderPanelDays = (year: number, month: number, isFirst: boolean) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDayOfWeek = new Date(year, month, 1).getDay() - 1;
    if (firstDayOfWeek === -1) firstDayOfWeek = 6;

    const prevMonthDays = new Date(year, month, 0).getDate();
    const cells: React.ReactNode[] = [];

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push(
        <div
          key={`prev-${i}`}
          className="figma-calendar-day other-month"
          onClick={() => handleDateClick(d)}
        >
          {prevMonthDays - i}
        </div>
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const thisDate = new Date(year, month, day);
      const isStart = startDate && isSameDay(thisDate, startDate);
      const isEnd = endDate && isSameDay(thisDate, endDate);
      const inRange = isDateInRange(thisDate);

      let cls = 'figma-calendar-day';
      if (isStart && isEnd) cls += ' range-start range-end';
      else if (isStart) cls += ' range-start';
      else if (isEnd) cls += ' range-end';
      else if (inRange) cls += ' in-range';

      cells.push(
        <div
          key={`day-${day}`}
          className={cls}
          onClick={() => handleDateClick(thisDate)}
          onMouseEnter={() => {
            if (startDate && !endDate) setHoverDate(thisDate);
          }}
        >
          {day}
        </div>
      );
    }

    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      cells.push(
        <div
          key={`next-${day}`}
          className="figma-calendar-day other-month"
          onClick={() => handleDateClick(d)}
        >
          {day}
        </div>
      );
    }

    return (
      <div className="figma-calendar-col">
        <div className="figma-calendar-header">
          {isFirst ? (
            <button type="button" className="figma-calendar-nav-btn" onClick={prevMonth1} title="Tháng trước">
              <ChevronLeft size={16} />
            </button>
          ) : (
            <button type="button" className="figma-calendar-nav-btn" onClick={prevMonth2} title="Tháng trước">
              <ChevronLeft size={16} />
            </button>
          )}

          <button
            type="button"
            className="figma-calendar-title-btn"
            onClick={() => {
              if (isFirst) setViewMode1('month');
              else setViewMode2('month');
            }}
            title="Chọn tháng"
          >
            {`Tháng ${month + 1}/${year}`}
          </button>

          {!isFirst ? (
            <button type="button" className="figma-calendar-nav-btn" onClick={nextMonth2} title="Tháng sau">
              <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" className="figma-calendar-nav-btn" onClick={nextMonth1} title="Tháng sau">
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        <div className="figma-calendar-weekdays">
          <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
        </div>

        <div className="figma-calendar-days">{cells}</div>
      </div>
    );
  };

  const renderPanelMonths = (year: number, isFirst: boolean) => {
    return (
      <div className="figma-calendar-col">
        <div className="figma-calendar-header">
          <button
            type="button"
            className="figma-calendar-nav-btn"
            onClick={() => {
              if (isFirst) setY1((y) => y - 1);
              else setY2((y) => y - 1);
            }}
            title="Năm trước"
          >
            <IconDoubleChevronLeft />
          </button>

          <button
            type="button"
            className="figma-calendar-title-btn"
            onClick={() => {
              if (isFirst) setViewMode1('year');
              else setViewMode2('year');
            }}
            title="Chọn năm"
          >
            {year}
          </button>

          <button
            type="button"
            className="figma-calendar-nav-btn"
            onClick={() => {
              if (isFirst) setY1((y) => y + 1);
              else setY2((y) => y + 1);
            }}
            title="Năm sau"
          >
            <IconDoubleChevronRight />
          </button>
        </div>

        <div className="figma-month-grid">
          {MONTH_NAMES.map((mName, idx) => {
            const isSelected =
              (startDate && startDate.getFullYear() === year && startDate.getMonth() === idx) ||
              (endDate && endDate.getFullYear() === year && endDate.getMonth() === idx);
            return (
              <div
                key={mName}
                className={`figma-month-cell ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  if (isFirst) {
                    setM1(idx);
                    setViewMode1('day');
                  } else {
                    setM2(idx);
                    setViewMode2('day');
                  }
                }}
              >
                {mName}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPanelYears = (year: number, isFirst: boolean) => {
    const startDecade = Math.floor(year / 10) * 10;
    const endDecade = startDecade + 9;
    const years = [];
    for (let y = startDecade - 1; y <= endDecade + 1; y++) {
      years.push(y);
    }

    return (
      <div className="figma-calendar-col">
        <div className="figma-calendar-header">
          <button
            type="button"
            className="figma-calendar-nav-btn"
            onClick={() => {
              if (isFirst) setY1((y) => y - 10);
              else setY2((y) => y - 10);
            }}
            title="Thập kỷ trước"
          >
            <IconDoubleChevronLeft />
          </button>

          <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
            {`${startDecade}-${endDecade}`}
          </span>

          <button
            type="button"
            className="figma-calendar-nav-btn"
            onClick={() => {
              if (isFirst) setY1((y) => y + 10);
              else setY2((y) => y + 10);
            }}
            title="Thập kỷ sau"
          >
            <IconDoubleChevronRight />
          </button>
        </div>

        <div className="figma-year-grid">
          {years.map((yVal, idx) => {
            const isOther = idx === 0 || idx === years.length - 1;
            const isSelected =
              (startDate && startDate.getFullYear() === yVal) ||
              (endDate && endDate.getFullYear() === yVal);
            return (
              <div
                key={yVal}
                className={`figma-year-cell ${isOther ? 'other-decade' : ''} ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  if (isFirst) {
                    setY1(yVal);
                    setViewMode1('month');
                  } else {
                    setY2(yVal);
                    setViewMode2('month');
                  }
                }}
              >
                {yVal}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="figma-dual-calendar-modal">
      <div className="figma-picker-body">
        {/* Presets Sidebar */}
        <div className="figma-picker-sidebar">
          {PRESET_OPTIONS.map((p) => (
            <button
              type="button"
              key={p.key}
              className={`figma-preset-item ${selectedPreset === p.key ? 'active' : ''}`}
              onClick={() => handlePresetClick(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Dual Calendar Panels */}
        <div className="figma-picker-calendars">
          <div className="figma-dual-calendar-grid">
            {viewMode1 === 'day'
              ? renderPanelDays(y1, m1, true)
              : viewMode1 === 'month'
              ? renderPanelMonths(y1, true)
              : renderPanelYears(y1, true)}

            {viewMode2 === 'day'
              ? renderPanelDays(y2, m2, false)
              : viewMode2 === 'month'
              ? renderPanelMonths(y2, false)
              : renderPanelYears(y2, false)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="figma-dual-calendar-footer">
        <div className="figma-dual-calendar-inputs">
          <input
            type="text"
            readOnly
            className="figma-calendar-input"
            placeholder="Từ ngày"
            value={formatVnDate(startDate)}
          />
          <span className="figma-calendar-input-sep">-</span>
          <input
            type="text"
            readOnly
            className="figma-calendar-input"
            placeholder="Đến ngày"
            value={formatVnDate(endDate)}
          />
        </div>
        <div className="figma-dual-calendar-btns">
          <button type="button" className="figma-btn-cancel" onClick={onCancel}>
            Hủy
          </button>
          <button type="button" className="figma-btn-save" onClick={handleSave}>
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

/* --------------------------------------------------------------------------
   MAIN REPORT PAGE COMPONENT (MATCHING EXACT FIGMA SPEC)
   -------------------------------------------------------------------------- */
export const AccessDataReportPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const rawRole = localStorage.getItem('currentUserRole') || localStorage.getItem('userRole') || '';
    const upper = rawRole.toUpperCase();
    const isAllowed = upper.includes('ESA08') || upper.includes('ETK08') || upper.includes('ETN08') || upper.includes('ADMIN') || upper.includes('QTERP') || upper.includes('USER');
    if (rawRole && !isAllowed) {
      toast.error('Bạn không có quyền truy cập trang thống kê');
      navigate('/view', { replace: true });
    }
  }, [navigate]);

  const [dateRange, setDateRange] = useState<DateFilterRange>(() => getPresetRange('today'));
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [, setLoading] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);
  const [monthlyViewsSeries, setMonthlyViewsSeries] = useState<MonthPoint[]>([]);
  const [branchMap, setBranchMap] = useState<Record<string, string>>({ ...DEFAULT_BRANCH_NAMES });
  const [totalBranchesCount, setTotalBranchesCount] = useState<number>(0);

  // Table filters & limits
  const [productSearch, setProductSearch] = useState('');
  const [productLimit, setProductLimit] = useState<number>(5);
  const [productSortField, setProductSortField] = useState<'viewCount' | 'savedCount'>('viewCount');
  const [productSortOrder, setProductSortOrder] = useState<'desc' | 'asc'>('desc');

  const [topSavedLimit, setTopSavedLimit] = useState<number>(5);
  const [topGroupLimit, setTopGroupLimit] = useState<number>(5);
  const [topViewedLimit, setTopViewedLimit] = useState<number>(5);
  const [topBranchLimit, setTopBranchLimit] = useState<number>(5);
  const [branchSearch, setBranchSearch] = useState('');
  const [branchLimit, setBranchLimit] = useState<number>(5);
  const [branchSortField, setBranchSortField] = useState<'accessCount' | 'viewCount'>('accessCount');
  const [branchSortOrder, setBranchSortOrder] = useState<'desc' | 'asc'>('desc');

  // Month Detail Popup state
  const [selectedMonthDetail, setSelectedMonthDetail] = useState<{
    month: number;
    year: number;
    totalViews: number;
  } | null>(null);
  const [monthProducts, setMonthProducts] = useState<RankItem[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthSearch, setMonthSearch] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch branches list for mapping names and total
  useEffect(() => {
    axios
      .get<Array<{ branchCode?: string; branchName?: string }>>(API_ENDPOINTS.BRANCHES.LIST)
      .then((res) => {
        const list = res.data || [];
        const map: Record<string, string> = { ...DEFAULT_BRANCH_NAMES };
        let count = 0;
        list.forEach((b) => {
          const code = String(b.branchCode || '').trim();
          if (!code) return;
          count++;
          const name = String(b.branchName || '').trim();
          if (name && name !== code) map[code] = name;
        });
        setBranchMap(map);
        if (count > 0) setTotalBranchesCount(count);
      })
      .catch(() => {
        setBranchMap({ ...DEFAULT_BRANCH_NAMES });
      });
  }, []);

  const [productActiveMap, setProductActiveMap] = useState<Record<string, boolean>>({});

  // Fetch product list to ensure 100% accurate active/hidden status in real-time
  const fetchProductList = useCallback(async () => {
    try {
      const res = await axios.get(API_ENDPOINTS.PRODUCT.LIST);
      const list = res.data?.content || res.data || [];
      if (Array.isArray(list)) {
        const map: Record<string, boolean> = {};
        list.forEach((p: any) => {
          if (p.id) {
            const isAct = p.active !== false && !p.cascadeHiddenBy;
            map[p.id] = isAct;
          }
        });
        setProductActiveMap(map);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchProductList();
  }, [fetchProductList]);

  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [businessesList, setBusinessesList] = useState<any[]>([]);

  // Fetch product hierarchy lists (groups, categories, businesses) for accurate counts
  const fetchHierarchyLists = useCallback(() => {
    Promise.allSettled([
      axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST),
      axios.get(API_ENDPOINTS.PRODUCT_CATEGORY.LIST),
      axios.get(API_ENDPOINTS.PRODUCT_BUSINESS.LIST),
    ])
      .then(([gRes, cRes, bRes]) => {
        if (gRes.status === 'fulfilled') {
          const list = gRes.value.data?.content || gRes.value.data || [];
          if (Array.isArray(list)) setGroupsList(list);
        }
        if (cRes.status === 'fulfilled') {
          const list = cRes.value.data?.content || cRes.value.data || [];
          if (Array.isArray(list)) setCategoriesList(list);
        }
        if (bRes.status === 'fulfilled') {
          const list = bRes.value.data?.content || bRes.value.data || [];
          if (Array.isArray(list)) setBusinessesList(list);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchHierarchyLists();
  }, [fetchHierarchyLists]);

  // Load report data from API
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const shouldCompare = dateRange.presetKey !== 'all_time' && Boolean(dateRange.compareFrom);
      const params: Record<string, any> = {
        periodType: dateRange.periodType,
        compare: shouldCompare,
        from: dateRange.from,
        to: dateRange.to,
        compareFrom: dateRange.compareFrom || undefined,
        compareTo: dateRange.compareTo || undefined,
      };

      if (dateRange.periodType === 'YEAR') {
        params.year = new Date(dateRange.from).getFullYear() || new Date().getFullYear();
        if (dateRange.compareFrom) {
          params.compareYear = new Date(dateRange.compareFrom).getFullYear();
        }
      }

      const res = await axios.get<ReportData>(API_ENDPOINTS.REPORTS.ACCESS_DATA, { params });
      setData(res.data);
      if (Array.isArray(res.data?.products)) {
        setProductActiveMap((prev) => {
          const next = { ...prev };
          res.data.products?.forEach((p) => {
            if (p.productId && p.active !== undefined) {
              next[p.productId] = Boolean(p.active);
            }
          });
          return next;
        });
      }

      if (dateRange.periodType === 'YEAR') {
        setMonthlyViewsSeries(res.data?.viewsByMonth || []);
      } else {
        const curYear = new Date(dateRange.from).getFullYear() || new Date().getFullYear();
        axios
          .get<ReportData>(API_ENDPOINTS.REPORTS.ACCESS_DATA, {
            params: { periodType: 'YEAR', year: curYear, compare: false },
          })
          .then((yearRes) => {
            setMonthlyViewsSeries(yearRes.data?.viewsByMonth || []);
          })
          .catch(() => {
            setMonthlyViewsSeries(res.data?.viewsByMonth || []);
          });
      }
    } catch (e: any) {
      console.error('Failed to load report data:', e);
      setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dateRange]);

  // Current report year for bar chart
  const currentReportYear = useMemo(() => {
    return new Date(dateRange.from).getFullYear() || new Date().getFullYear();
  }, [dateRange.from]);

  // Handle month bar click to show detail popup
  const handleSelectMonth = useCallback((month: number, year: number, val: number) => {
    setSelectedMonthDetail({ month, year, totalViews: val });
    setMonthSearch('');

    if (val === 0) {
      setMonthProducts([]);
      setMonthLoading(false);
      return;
    }

    setMonthLoading(true);
    const monthStr = String(month).padStart(2, '0');
    const from = `${year}-${monthStr}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    axios
      .get<ReportData>(API_ENDPOINTS.REPORTS.ACCESS_DATA, {
        params: {
          periodType: 'MONTH',
          from,
          to,
          compare: false,
        },
      })
      .then((res) => {
        const prods = (res.data?.products || [])
          .filter((p) => (p.viewCount || 0) > 0)
          .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        setMonthProducts(prods);
        if (res.data?.yearViews !== undefined && res.data.yearViews !== null) {
          const yv = res.data.yearViews;
          setSelectedMonthDetail((prev) => (prev ? { ...prev, totalViews: yv } : null));
        }
      })
      .catch((err) => {
        console.error('Error loading month product details:', err);
        toast.error(`Không thể tải chi tiết lượt xem tháng ${month}`);
        setMonthProducts([]);
      })
      .finally(() => {
        setMonthLoading(false);
      });
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedMonthDetail(null);
      }
    };
    if (selectedMonthDetail) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMonthDetail]);

  // Derived comparison period label (specific day, month, year)
  const currentCompareText = useMemo(() => {
    if (dateRange.presetKey === 'all_time') return '';
    if (dateRange.compareLabel) return dateRange.compareLabel;
    return formatCompareDateLabel(
      dateRange.compareFrom,
      dateRange.compareTo,
      dateRange.periodType
    );
  }, [dateRange]);

  // Trend Badge Helper for comparing with previous period
  const renderTrendBadge = (
    cur: number,
    cmp: number,
    inverted = false
  ) => {
    if (!data || dateRange.presetKey === 'all_time') {
      return (
        <div className="figma-trend-wrap">
          <span className="figma-trend-badge gray">--</span>
        </div>
      );
    }
    const { absPctText, isPositive, isZero } = calcGrowthPct(cur, cmp);
    const isGood = inverted ? !isPositive : isPositive;
    const badgeElement = isZero ? (
      <span className="figma-trend-badge gray">
        <span>{absPctText}</span>
      </span>
    ) : (
      <span className={`figma-trend-badge ${isGood ? 'positive' : 'negative'}`}>
        {isPositive ? (
          <img src={iconLen} alt="tăng" className="figma-trend-icon" />
        ) : (
          <img src={iconXuong} alt="giảm" className="figma-trend-icon" />
        )}
        <span>{absPctText}</span>
      </span>
    );

    return (
      <div className="figma-trend-wrap">
        {badgeElement}
        {currentCompareText ? (
          <span className="figma-trend-compare-label" title={`So với ${currentCompareText}`}>
            so với {currentCompareText}
          </span>
        ) : null}
      </div>
    );
  };

  useEffect(() => {
    load(false);
  }, [load]);

  // Real-time auto-refresh in background & across tabs
  useAdminAutoRefresh(() => {
    load(true);
    fetchHierarchyLists();
    fetchProductList();
  }, [load, fetchHierarchyLists, fetchProductList]);

  // KPI Metrics: Bind real API data directly from backend
  const curAccesses = data?.periodAccessSessions ?? 0;
  const curViews = data?.yearViews ?? 0;
  const curBranches = data?.activeBranchCount ?? 0;
  const effectiveTotalBranches = data?.totalSystemBranches || (totalBranchesCount && totalBranchesCount !== 5000 ? totalBranchesCount : 0);
  const curUsers = data?.periodActiveUsers ?? 0;
  const allUsers = data?.allActiveUsers ?? 0;
  const inactiveUsers = Math.max(0, allUsers - curUsers);

  const branchActivePercentage =
    effectiveTotalBranches > 0 ? (curBranches / effectiveTotalBranches) * 100 : 0;

  // Count active and hidden items from hierarchy entity list
  const countHierarchyItems = (list: any[]) => {
    if (!list || list.length === 0) return { total: 0, active: 0, hidden: 0 };
    const seen = new Set<string>();
    const uniqueList: any[] = [];
    for (const item of list) {
      const key = item.originalId || item.id;
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      uniqueList.push(item);
    }
    // Only count approved/active items (not DRAFT, PENDING_APPROVAL, REJECTED, ARCHIVED)
    const approvedList = uniqueList.filter((item) => {
      const st = String(item.status || '').toUpperCase();
      return !st || st === 'ACTIVE' || st === 'APPROVED';
    });
    const total = approvedList.length;
    const active = approvedList.filter(
      (item) => item.active !== false && !item.cascadeHiddenBy
    ).length;
    const hidden = Math.max(0, total - active);
    return { total, active, hidden };
  };

  // Product Hierarchy Counts (Nhóm, Sản phẩm, Danh mục 1, Danh mục 2)
  const hierarchyCounts = useMemo(() => {
    const map: Record<string, number> = {};
    const compareMap: Record<string, number> = {};
    (data?.compareMetrics || []).forEach((m) => {
      if (m.key) {
        map[m.key] = Number(m.yearValue) ?? 0;
        if (m.compareValue !== undefined && m.compareValue !== null) {
          compareMap[m.key] = Number(m.compareValue) ?? 0;
        }
      }
    });

    const groupsStat = countHierarchyItems(groupsList);
    const categoriesStat = countHierarchyItems(categoriesList);
    const businessesStat = countHierarchyItems(businessesList);

    const totalGroups = groupsStat.total > 0 ? groupsStat.total : (data?.totalGroups ?? map['groups'] ?? 0);
    const activeGroups = groupsStat.total > 0 ? groupsStat.active : totalGroups;
    const hiddenGroups = groupsStat.total > 0 ? groupsStat.hidden : 0;

    const totalCategories = categoriesStat.total > 0 ? categoriesStat.total : (data?.totalCategories ?? map['categories'] ?? 0);
    const activeCategories = categoriesStat.total > 0 ? categoriesStat.active : totalCategories;
    const hiddenCategories = categoriesStat.total > 0 ? categoriesStat.hidden : 0;

    const totalBusinesses = businessesStat.total > 0 ? businessesStat.total : (data?.totalBusinesses ?? map['businesses'] ?? 0);
    const activeBusinesses = businessesStat.total > 0 ? businessesStat.active : totalBusinesses;
    const hiddenBusinesses = businessesStat.total > 0 ? businessesStat.hidden : 0;

    const groups = map['groups'] ?? totalGroups;
    const categories = map['categories'] ?? totalCategories;
    const businesses = map['businesses'] ?? totalBusinesses;
    const products = data?.productCount ?? map['products'] ?? 0;

    return {
      groups,
      categories,
      businesses,
      products,
      compareMap,
      totalGroups,
      activeGroups,
      hiddenGroups,
      totalCategories,
      activeCategories,
      hiddenCategories,
      totalBusinesses,
      activeBusinesses,
      hiddenBusinesses,
    };
  }, [data, groupsList, categoriesList, businessesList]);

  // Detailed 3 Super Groups Breakdown (SERVICE, INSURANCE, PROGRAM)
  const superGroupStats = useMemo<SuperGroupProductStat[]>(() => {
    // 1. If backend API already provided superGroupStats, use it
    if (data?.superGroupStats && data.superGroupStats.length > 0) {
      return data.superGroupStats;
    }

    // 2. Otherwise calculate dynamically from product list
    const list = data?.products || [];
    if (list.length > 0) {
      let sAct = 0, sHid = 0;
      let iAct = 0, iHid = 0;
      let pAct = 0, pHid = 0;

      list.forEach((p) => {
        const isAct = productActiveMap[p.productId] !== undefined
          ? productActiveMap[p.productId]
          : p.active !== undefined
          ? Boolean(p.active)
          : true;

        const gName = (p.groupName || '').toLowerCase();
        if (gName.includes('bảo hiểm')) {
          if (isAct) iAct++;
          else iHid++;
        } else if (gName.includes('ưu đãi') || gName.includes('chương trình')) {
          if (isAct) pAct++;
          else pHid++;
        } else {
          if (isAct) sAct++;
          else sHid++;
        }
      });

      return [
        {
          superGroup: 'SERVICE',
          name: 'SPDV thuộc nhóm sản phẩm dịch vụ',
          activeCount: sAct,
          hiddenCount: sHid,
          totalCount: sAct + sHid,
        },
        {
          superGroup: 'INSURANCE',
          name: 'SPDV thuộc nhóm sản phẩm bảo hiểm',
          activeCount: iAct,
          hiddenCount: iHid,
          totalCount: iAct + iHid,
        },
        {
          superGroup: 'PROGRAM',
          name: 'SPDV thuộc nhóm chương trình ưu đãi',
          activeCount: pAct,
          hiddenCount: pHid,
          totalCount: pAct + pHid,
        },
      ];
    }

    // 3. Fallback when no data
    return [
      {
        superGroup: 'SERVICE',
        name: 'SPDV thuộc nhóm sản phẩm dịch vụ',
        activeCount: 0,
        hiddenCount: 0,
        totalCount: 0,
      },
      {
        superGroup: 'INSURANCE',
        name: 'SPDV thuộc nhóm sản phẩm bảo hiểm',
        activeCount: 0,
        hiddenCount: 0,
        totalCount: 0,
      },
      {
        superGroup: 'PROGRAM',
        name: 'SPDV thuộc nhóm chương trình ưu đãi',
        activeCount: 0,
        hiddenCount: 0,
        totalCount: 0,
      },
    ];
  }, [data?.superGroupStats, data?.products, productActiveMap]);

  // Product Activity Counts for Donut Chart & Hero Card
  const { activeProductCount, inactiveProductCount, totalProductCount } = useMemo(() => {
    if (data?.activeProductCount !== undefined && data?.inactiveProductCount !== undefined) {
      const act = data.activeProductCount;
      const inact = data.inactiveProductCount;
      return {
        activeProductCount: act,
        inactiveProductCount: inact,
        totalProductCount: act + inact,
      };
    }
    const sumActive = superGroupStats.reduce((acc, g) => acc + g.activeCount, 0);
    const sumHidden = superGroupStats.reduce((acc, g) => acc + g.hiddenCount, 0);
    const sumTotal = sumActive + sumHidden;

    return {
      activeProductCount: sumActive,
      inactiveProductCount: sumHidden,
      totalProductCount: sumTotal,
    };
  }, [data?.activeProductCount, data?.inactiveProductCount, superGroupStats]);

  // Chart data: Group views & saves
  const topGroupViews = useMemo(() => {
    const map: Record<string, number> = {};
    (data?.products || data?.topByViews || []).forEach((p) => {
      const g = p.groupName?.trim();
      if (g && g !== '---') {
        map[g] = (map[g] || 0) + (p.viewCount || 0);
      }
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, topGroupLimit);
  }, [data?.products, data?.topByViews, topGroupLimit]);

  // Top products list by saves
  const topSavedProductsList = useMemo(() => {
    const source = (data?.products && data.products.length > 0)
      ? data.products
      : (data?.topBySaves || []);
    return source
      .filter((p) => (p.savedCount || 0) > 0)
      .sort((a, b) => (b.savedCount || 0) - (a.savedCount || 0))
      .slice(0, topSavedLimit)
      .map((p) => ({
        name: p.productName,
        value: p.savedCount || 0,
      }));
  }, [data?.products, data?.topBySaves, topSavedLimit]);

  // Top products by views (Chart in row 3)
  const topViewedProductsBars = useMemo(() => {
    const source = (data?.products && data.products.length > 0)
      ? data.products
      : (data?.topByViews || []);
    return source
      .filter((p) => (p.viewCount || 0) > 0)
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, topViewedLimit)
      .map((p) => ({
        label: p.productName,
        value: p.viewCount || 0,
      }));
  }, [data?.products, data?.topByViews, topViewedLimit]);

  // Top branches horizontal bars
  const topBranchBars = useMemo(() => {
    return (data?.byBranch || [])
      .map((b) => ({
        label: branchMap[b.branchCode] || b.branchName || b.branchCode,
        value: b.accessCount || b.viewCount || 0,
      }))
      .filter((b) => b.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, topBranchLimit);
  }, [data?.byBranch, branchMap, topBranchLimit]);

  // Filtered Products Table
  const tableProducts = useMemo(() => {
    let list: Array<{
      id: string;
      name: string;
      group: string;
      views: number;
      saves: number;
      active: boolean;
    }> = [];

    if (data?.products && data.products.length > 0) {
      list = data.products.map((p) => {
        const isActive = productActiveMap[p.productId] !== undefined
          ? productActiveMap[p.productId]
          : p.active !== undefined
          ? Boolean(p.active)
          : true;

        return {
          id: p.productId,
          name: p.productName,
          group: p.groupName && p.groupName !== '---' ? p.groupName : 'Chưa phân nhóm',
          views: p.viewCount || 0,
          saves: p.savedCount || 0,
          active: isActive,
        };
      });
    }

    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.group.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      const vA = productSortField === 'viewCount' ? a.views : a.saves;
      const vB = productSortField === 'viewCount' ? b.views : b.saves;
      return productSortOrder === 'desc' ? vB - vA : vA - vB;
    });

    return list.slice(0, productLimit);
  }, [data?.products, productActiveMap, productSearch, productSortField, productSortOrder, productLimit]);

  // Real users per branch from byUser data
  const usersPerBranch = useMemo(() => {
    const map: Record<string, number> = {};
    (data?.byUser || []).forEach((u) => {
      const code = u.branchCode?.trim();
      if (code) {
        map[code] = (map[code] || 0) + 1;
      }
    });
    return map;
  }, [data?.byUser]);

  // Filtered Branches Table
  const tableBranches = useMemo(() => {
    let list: Array<{
      code: string;
      name: string;
      accesses: number;
      users: number;
    }> = [];

    if (data?.byBranch && data.byBranch.length > 0) {
      list = data.byBranch.map((b) => ({
        code: b.branchCode,
        name: branchMap[b.branchCode] || b.branchName || b.branchCode,
        accesses: b.accessCount || b.viewCount || 0,
        users: usersPerBranch[b.branchCode] ?? (b.userCount ?? 0),
      }));
    }

    if (branchSearch.trim()) {
      const q = branchSearch.toLowerCase();
      list = list.filter((b) => b.code.toLowerCase().includes(q) || b.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      const vA = branchSortField === 'accessCount' ? a.accesses : a.users;
      const vB = branchSortField === 'accessCount' ? b.accesses : b.users;
      return branchSortOrder === 'desc' ? vB - vA : vA - vB;
    });

    return list.slice(0, branchLimit);
  }, [data?.byBranch, branchMap, usersPerBranch, branchSearch, branchSortField, branchSortOrder, branchLimit]);

  // Export PDF functionality
  const exportPdf = () => {
    const toastId = toast.loading('Đang tạo tệp báo cáo PDF...');
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const margin = 36;
      let y = margin;

      pdf.setFontSize(16);
      pdf.text(pdfText('Bao cao thong ke So tay KHDN'), margin, y);
      y += 18;
      pdf.setFontSize(10);
      pdf.text(pdfText(`Thoi gian: ${dateRange.label} | Ngay tao: ${new Date().toLocaleDateString('vi-VN')}`), margin, y);
      y += 16;

      autoTable(pdf, {
        startY: y,
        head: [[pdfText('Tong luot truy cap'), pdfText('Tong luot xem SP'), pdfText('So CN hoat dong'), pdfText('Tong nguoi dung')]],
        body: [[
          formatNumber(curAccesses),
          formatNumber(curViews),
          `${formatNumber(curBranches)} / ${formatNumber(effectiveTotalBranches)}`,
          formatNumber(curUsers),
        ]],
        theme: 'grid',
        headStyles: { fillColor: [24, 144, 255] },
      });

      pdf.save(`Thong_ke_So_tay_${formatIsoDate(new Date())}.pdf`);
      toast.success('Xuất PDF thành công', { id: toastId });
    } catch (e) {
      toast.error('Lỗi tạo PDF', { id: toastId });
    }
  };

  return (
    <div className="figma-report-page">
      <div className="figma-report-container">
        {/* =====================================================================
            TOP BAR & ACTIONS
            ===================================================================== */}
        <div className="figma-topbar">
          <h1 className="figma-page-title">Thống kê</h1>

          <div className="figma-topbar-actions" ref={menuRef}>
            {/* Bookmark / PDF Button */}
            <button
              type="button"
              className="figma-icon-btn"
              title="Xuất PDF / Lưu báo cáo"
              onClick={exportPdf}
            >
              <Archive size={16} />
            </button>

            {/* Date Filter Trigger */}
            <button
              type="button"
              className={`figma-filter-trigger ${showFilterMenu ? 'is-active' : ''}`}
              onClick={() => setShowFilterMenu((v) => !v)}
            >
              <Calendar size={15} style={{ color: '#64748B' }} />
              <span>{dateRange.label}</span>
            </button>

            {/* Dual Month Range Calendar Picker */}
            {showFilterMenu ? (
              <DualMonthRangePicker
                currentRange={dateRange}
                onApply={(range) => {
                  setDateRange(range);
                  setShowFilterMenu(false);
                }}
                onCancel={() => setShowFilterMenu(false)}
              />
            ) : null}
          </div>
        </div>

        {/* =====================================================================
            SECTION 1: TỔNG QUAN (4 KPI CARDS)
            ===================================================================== */}
        <section className="figma-section">
          <h2 className="figma-section-title">Tổng quan</h2>
          <div className="figma-kpi-grid">
            {/* Card 1: Access Sessions */}
            <div className="figma-kpi-card">
              <div className="figma-kpi-value-row">
                <span className="figma-kpi-value">{data ? formatCompact(curAccesses) : '--'}</span>
                {renderTrendBadge(curAccesses, data?.compareAccessSessions ?? 0)}
              </div>
              <div className="figma-kpi-label">
                <span>Tổng số lượt truy cập hệ thống</span>
                <span
                  className="figma-kpi-info-icon"
                  title={data ? `Tổng số phiên truy cập: ${formatNumber(curAccesses)}` : 'Chưa có dữ liệu'}
                >
                  <Info size={13.5} />
                </span>
              </div>
            </div>

            {/* Card 2: Product Views */}
            <div className="figma-kpi-card">
              <div className="figma-kpi-value-row">
                <span className="figma-kpi-value">{data ? formatCompact(curViews) : '--'}</span>
                {renderTrendBadge(curViews, data?.compareYearViews ?? 0)}
              </div>
              <div className="figma-kpi-label">
                <span>Tổng lượt xem sản phẩm</span>
                <span
                  className="figma-kpi-info-icon"
                  title={data ? `Tổng số lượt xem chi tiết sản phẩm: ${formatNumber(curViews)}` : 'Chưa có dữ liệu'}
                >
                  <Info size={13.5} />
                </span>
              </div>
            </div>

            {/* Card 3: Active Branches */}
            <div className="figma-kpi-card">
              <div className="figma-kpi-value-row">
                <span className="figma-kpi-value">{data ? formatNumber(curBranches) : '--'}</span>
                <span className="figma-kpi-total-slash">/{data ? formatNumber(effectiveTotalBranches) : '--'}</span>
              </div>
              <div className="figma-kpi-label">
                <span>Số chi nhánh có hoạt động</span>
                <span
                  className="figma-kpi-info-icon"
                  title={data ? `Số chi nhánh có hoạt động: ${curBranches}/${effectiveTotalBranches}` : 'Chưa có dữ liệu'}
                >
                  <Info size={13.5} />
                </span>
              </div>
            </div>

            {/* Card 4: Total Active Users */}
            <div className="figma-kpi-card">
              <div className="figma-kpi-value-row">
                <span className="figma-kpi-value">{data ? formatNumber(curUsers) : '--'}</span>
                {renderTrendBadge(curUsers, data?.compareActiveUsers ?? 0)}
              </div>
              <div className="figma-kpi-label">
                <span>Tổng user hoạt động</span>
                <span
                  className="figma-kpi-info-icon"
                  title={data ? `Tổng số người dùng hoạt động: ${formatNumber(curUsers)}` : 'Chưa có dữ liệu'}
                >
                  <Info size={13.5} />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION: THỐNG KÊ SẢN PHẨM
            ===================================================================== */}
        <section className="figma-section">
          <h2 className="figma-section-title">Thống kê sản phẩm</h2>

          {/* Row 1: Product Hero Card + Donut Chart */}
          <div className="figma-grid-50-50">
            {/* Left: Product Hero Summary Card */}
            <div className="figma-product-hero-card">
              <div className="figma-product-hero-left">
                <div className="figma-product-hero-left-inner">
                  <div className="figma-product-hero-val-wrap">
                    <span className="figma-product-hero-val">
                      {data ? activeProductCount : '--'}
                    </span>
                    {renderTrendBadge(curViews, data?.compareYearViews ?? 0)}
                  </div>
                  <div className="figma-product-hero-title">
                    <span>Sản phẩm dịch vụ đang hoạt động</span>
                    <span
                      className="figma-kpi-info-icon"
                      title="Số lượng sản phẩm đang hoạt động"
                    >
                      <Info size={14} style={{ color: '#BFBFBF' }} />
                    </span>
                  </div>

                  <div className="figma-product-hero-substats">
                    <div className="figma-product-substat-inline">
                      <span className="figma-product-substat-val">
                        {data ? totalProductCount : '--'}
                      </span>
                      <span className="figma-product-substat-label">Tổng số sản phẩm</span>
                    </div>
                    <div className="figma-product-substat-inline">
                      <span className="figma-product-substat-val gray">
                        {data ? inactiveProductCount : '--'}
                      </span>
                      <span className="figma-product-substat-label">Sản phẩm bị ẩn</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="figma-product-hero-right">
                {superGroupStats.map((item) => (
                  <div key={item.superGroup} className="figma-product-breakdown-item">
                    <div className="figma-product-breakdown-val-row">
                      <span className="figma-product-breakdown-num">
                        {data ? item.activeCount : '--'}
                      </span>
                      <span className="figma-product-breakdown-slash">
                        /{data ? item.totalCount : '--'}
                      </span>
                      <span className="figma-product-hidden-pill">
                        <EyeOff size={12} strokeWidth={1.75} style={{ color: '#8C8C8C' }} />
                        <span>{data ? `${item.hiddenCount} ẩn` : '-- ẩn'}</span>
                      </span>
                    </div>
                    <span className="figma-product-breakdown-label">
                      {(() => {
                        const n = (item.name || '').toLowerCase();
                        if (item.superGroup === 'SERVICE' || n.includes('dịch vụ')) return 'SPDV thuộc nhóm sản phẩm dịch vụ';
                        if (item.superGroup === 'INSURANCE' || n.includes('bảo hiểm')) return 'SPDV thuộc nhóm sản phẩm bảo hiểm';
                        if (item.superGroup === 'PROGRAM' || n.includes('ưu đãi') || n.includes('chương trình')) return 'SPDV thuộc nhóm chương trình ưu đãi';
                        return item.name?.startsWith('SPDV thuộc ') ? item.name : `SPDV thuộc ${item.name || ''}`;
                      })()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Donut Chart - Tỷ lệ sản phẩm đang hoạt động và không hoạt động */}
            <div className="figma-card">
              <div className="figma-card-head">
                <h3 className="figma-card-title">Tỷ lệ sản phẩm đang hoạt động và không hoạt động</h3>
              </div>
              <FigmaProductActivityDonut
                hasData={Boolean(data && totalProductCount > 0)}
                activeProducts={activeProductCount}
                inactiveProducts={inactiveProductCount}
              />
            </div>
          </div>

          {/* Row 2: 3 Hierarchy KPI Cards in a row */}
          <div className="figma-grid-3-col">
            {/* Card 1: Nhóm sản phẩm */}
            <div className="figma-hierarchy-card">
              <div className="figma-hierarchy-top">
                <div className="figma-hierarchy-val-wrap">
                  <span className="figma-hierarchy-val">
                    {data ? formatNumber(hierarchyCounts.activeGroups) : '--'}
                  </span>
                  {renderTrendBadge(hierarchyCounts.activeGroups, hierarchyCounts.compareMap['groups'] ?? 0)}
                </div>
                <div className="figma-hierarchy-title">
                  <span>Nhóm sản phẩm đang hoạt động</span>
                  <span
                    className="figma-kpi-info-icon"
                    title="Số lượng nhóm sản phẩm đang hoạt động"
                  >
                    <Info size={13.5} style={{ color: '#BFBFBF' }} />
                  </span>
                </div>
              </div>

              <div className="figma-hierarchy-substats">
                <div className="figma-hierarchy-substat-inline">
                  <span className="figma-hierarchy-substat-val">
                    {data ? formatNumber(hierarchyCounts.totalGroups) : '--'}
                  </span>
                  <span className="figma-hierarchy-substat-label">Tổng số nhóm SP</span>
                </div>
                <div className="figma-hierarchy-substat-inline">
                  <span className="figma-hierarchy-substat-val gray">
                    {data ? formatNumber(hierarchyCounts.hiddenGroups) : '--'}
                  </span>
                  <span className="figma-hierarchy-substat-label">Nhóm SP bị ẩn</span>
                </div>
              </div>
            </div>

            {/* Card 2: Danh mục sản phẩm cấp 1 */}
            <div className="figma-hierarchy-card">
              <div className="figma-hierarchy-top">
                <div className="figma-hierarchy-val-wrap">
                  <span className="figma-hierarchy-val">
                    {data ? formatNumber(hierarchyCounts.activeCategories) : '--'}
                  </span>
                  {renderTrendBadge(hierarchyCounts.activeCategories, hierarchyCounts.compareMap['categories'] ?? 0)}
                </div>
                <div className="figma-hierarchy-title">
                  <span>Danh mục SP cấp 1 đang hoạt động</span>
                  <span
                    className="figma-kpi-info-icon"
                    title="Số lượng danh mục sản phẩm cấp 1 đang hoạt động"
                  >
                    <Info size={13.5} style={{ color: '#BFBFBF' }} />
                  </span>
                </div>
              </div>

              <div className="figma-hierarchy-substats">
                <div className="figma-hierarchy-substat-inline">
                  <span className="figma-hierarchy-substat-val">
                    {data ? formatNumber(hierarchyCounts.totalCategories) : '--'}
                  </span>
                  <span className="figma-hierarchy-substat-label">Tổng số danh mục cấp 1</span>
                </div>
                <div className="figma-hierarchy-substat-inline">
                  <span className="figma-hierarchy-substat-val gray">
                    {data ? formatNumber(hierarchyCounts.hiddenCategories) : '--'}
                  </span>
                  <span className="figma-hierarchy-substat-label">Danh mục cấp 1 bị ẩn</span>
                </div>
              </div>
            </div>

            {/* Card 3: Danh mục sản phẩm cấp 2 */}
            <div className="figma-hierarchy-card">
              <div className="figma-hierarchy-top">
                <div className="figma-hierarchy-val-wrap">
                  <span className="figma-hierarchy-val">
                    {data ? formatNumber(hierarchyCounts.activeBusinesses) : '--'}
                  </span>
                  {renderTrendBadge(hierarchyCounts.activeBusinesses, hierarchyCounts.compareMap['businesses'] ?? 0)}
                </div>
                <div className="figma-hierarchy-title">
                  <span>Danh mục SP cấp 2 đang hoạt động</span>
                  <span
                    className="figma-kpi-info-icon"
                    title="Số lượng danh mục sản phẩm cấp 2 đang hoạt động"
                  >
                    <Info size={13.5} style={{ color: '#BFBFBF' }} />
                  </span>
                </div>
              </div>

              <div className="figma-hierarchy-substats">
                <div className="figma-hierarchy-substat-inline">
                  <span className="figma-hierarchy-substat-val">
                    {data ? formatNumber(hierarchyCounts.totalBusinesses) : '--'}
                  </span>
                  <span className="figma-hierarchy-substat-label">Tổng số danh mục cấp 2</span>
                </div>
                <div className="figma-hierarchy-substat-inline">
                  <span className="figma-hierarchy-substat-val gray">
                    {data ? formatNumber(hierarchyCounts.hiddenBusinesses) : '--'}
                  </span>
                  <span className="figma-hierarchy-substat-label">Danh mục cấp 2 bị ẩn</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 2: THỐNG KÊ TRA CỨU
            ===================================================================== */}
        <section className="figma-section">
          <h2 className="figma-section-title">Thống kê tra cứu</h2>

          {/* Row 1: Views Bar Chart (63%) + Top Saved Products (37%) */}
          <div className="figma-grid-65-35">
            <div className="figma-card">
              <div className="figma-card-head">
                <h3 className="figma-card-title">Lượt xem sản phẩm theo tháng</h3>
              </div>
              {!data ? (
                <div className="figma-empty-state">
                  <span>--</span>
                </div>
              ) : (
                <FigmaMonthlyBarChart
                  series={monthlyViewsSeries.length > 0 ? monthlyViewsSeries : data?.viewsByMonth}
                  year={currentReportYear}
                  onSelectMonth={handleSelectMonth}
                />
              )}
            </div>

            <div className="figma-card">
              <div className="figma-card-head">
                <h3 className="figma-card-title">Top sản phẩm được lưu nhiều nhất</h3>
                <div className="figma-select-wrap">
                  <select
                    className="figma-card-select"
                    value={topSavedLimit}
                    onChange={(e) => setTopSavedLimit(Number(e.target.value))}
                  >
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                    <option value={20}>Top 20</option>
                    <option value={999999}>Tất cả</option>
                  </select>
                  <ChevronDown size={13} className="figma-select-arrow" />
                </div>
              </div>
              <div className="figma-scrollable-content">
                <div className="figma-rank-list">
                  {!data ? (
                    <div className="figma-empty-state">
                      <span>--</span>
                    </div>
                  ) : topSavedProductsList.length > 0 ? (
                    topSavedProductsList.map((item, idx) => (
                      <div className="figma-rank-item" key={idx}>
                        <div className="figma-rank-item-left">
                          <span className="figma-rank-num">{idx + 1}</span>
                          <span className="figma-rank-name" title={item.name}>{item.name}</span>
                        </div>
                        <span className="figma-rank-val">{item.value.toLocaleString('vi-VN')}</span>
                      </div>
                    ))
                  ) : (
                    <div className="figma-empty-state">
                      <span>Chưa có sản phẩm nào được lưu trong khoảng thời gian này</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Top Groups Viewed (Mint Green) + Top Products Viewed (Light Blue) */}
          <div className="figma-grid-50-50">
            <div className="figma-card">
              <div className="figma-card-head">
                <h3 className="figma-card-title">Top nhóm sản phẩm được xem nhiều nhất</h3>
                <div className="figma-select-wrap">
                  <select
                    className="figma-card-select"
                    value={topGroupLimit}
                    onChange={(e) => setTopGroupLimit(Number(e.target.value))}
                  >
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                    <option value={20}>Top 20</option>
                    <option value={999999}>Tất cả</option>
                  </select>
                  <ChevronDown size={13} className="figma-select-arrow" />
                </div>
              </div>
              <div className="figma-scrollable-content">
                {!data ? (
                  <div className="figma-empty-state">
                    <span>--</span>
                  </div>
                ) : (
                  <FigmaHorizontalBarChart items={topGroupViews} theme="green" />
                )}
              </div>
            </div>

            <div className="figma-card">
              <div className="figma-card-head">
                <h3 className="figma-card-title">Top sản phẩm được xem nhiều nhất</h3>
                <div className="figma-select-wrap">
                  <select
                    className="figma-card-select"
                    value={topViewedLimit}
                    onChange={(e) => setTopViewedLimit(Number(e.target.value))}
                  >
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                    <option value={20}>Top 20</option>
                    <option value={999999}>Tất cả</option>
                  </select>
                  <ChevronDown size={13} className="figma-select-arrow" />
                </div>
              </div>
              <div className="figma-scrollable-content">
                {!data ? (
                  <div className="figma-empty-state">
                    <span>--</span>
                  </div>
                ) : (
                  <FigmaHorizontalBarChart items={topViewedProductsBars} theme="blue" />
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Product Overview Table (Full Width Card) */}
          <div className="figma-card">
            <div className="figma-card-head">
              <div>
                <h3 className="figma-card-title">Tổng quan sản phẩm</h3>
                <p className="figma-card-sub">Xem chi tiết số lượt xem theo từng sản phẩm</p>
              </div>
              <div className="figma-card-actions">
                <div className="figma-card-search">
                  <Search size={14} style={{ color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <div className="figma-select-wrap">
                  <select
                    className="figma-card-select"
                    value={productLimit}
                    onChange={(e) => setProductLimit(Number(e.target.value))}
                  >
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                    <option value={20}>Top 20</option>
                    <option value={999999}>Tất cả</option>
                  </select>
                  <ChevronDown size={13} className="figma-select-arrow" />
                </div>
              </div>
            </div>

            <div className="figma-table-wrap">
              <table className="figma-table">
                <thead>
                  <tr>
                    <th style={{ width: 65 }}>Thứ hạng</th>
                    <th>Sản phẩm</th>
                    <th>Nhóm</th>
                    <th
                      className="sortable"
                      onClick={() => {
                        if (productSortField === 'viewCount') {
                          setProductSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
                        } else {
                          setProductSortField('viewCount');
                          setProductSortOrder('desc');
                        }
                      }}
                    >
                      <span className="figma-th-inner">
                        <span>Lượt xem</span>
                        <ArrowUpDown size={12} className="figma-sort-icon" />
                      </span>
                    </th>
                    <th
                      className="sortable"
                      onClick={() => {
                        if (productSortField === 'savedCount') {
                          setProductSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
                        } else {
                          setProductSortField('savedCount');
                          setProductSortOrder('desc');
                        }
                      }}
                    >
                      <span className="figma-th-inner">
                        <span>Lượt lưu</span>
                        <ArrowUpDown size={12} className="figma-sort-icon" />
                      </span>
                    </th>
                    <th style={{ width: 85, textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {!data ? (
                    <tr>
                      <td colSpan={6} className="figma-table-empty">
                        --
                      </td>
                    </tr>
                  ) : tableProducts.length > 0 ? (
                    tableProducts.map((p, idx) => (
                      <tr key={p.id || idx}>
                        <td style={{ color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 500, maxWidth: 280 }}>
                          {p.name}
                        </td>
                        <td style={{ color: '#64748B', maxWidth: 220 }}>
                          {p.group}
                        </td>
                        <td>{p.views.toLocaleString('vi-VN')}</td>
                        <td>{p.saves.toLocaleString('vi-VN')}</td>
                        <td style={{ textAlign: 'center' }}>
                          {p.active ? (
                            <span className="figma-badge-active">Hiện</span>
                          ) : (
                            <span className="figma-badge-inactive">Ẩn</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="figma-table-empty">
                        Không tìm thấy dữ liệu sản phẩm
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 3: NGƯỜI DÙNG & CHI NHÁNH
            ===================================================================== */}
        <section className="figma-section">
          <h2 className="figma-section-title">Người dùng & Chi nhánh</h2>

          {/* Row 1: Active Branch Ratio Gauge + User Activity Donut */}
          <div className="figma-grid-50-50">
            <div className="figma-card">
              <div className="figma-card-head">
                <h3 className="figma-card-title">Tỷ lệ chi nhánh có hoạt động</h3>
              </div>
              <FigmaSemiCircleGauge
                hasData={Boolean(data)}
                percentage={branchActivePercentage}
                activeCount={curBranches}
                totalCount={effectiveTotalBranches}
              />
            </div>

            <div className="figma-card">
              <div className="figma-card-head">
                <h3 className="figma-card-title">Tỷ lệ người dùng đang hoạt động và không hoạt động</h3>
              </div>
              <FigmaUserActivityDonut
                hasData={Boolean(data && allUsers > 0)}
                activeUsers={curUsers}
                inactiveUsers={inactiveUsers}
              />
            </div>
          </div>

          {/* Row 2: Top Branches Horizontal Bars + Branch Interaction Table */}
          <div className="figma-grid-38-62">
            <div className="figma-card">
              <div className="figma-card-head">
                <h3 className="figma-card-title">Top chi nhánh theo lượt truy cập</h3>
                <div className="figma-select-wrap">
                  <select
                    className="figma-card-select"
                    value={topBranchLimit}
                    onChange={(e) => setTopBranchLimit(Number(e.target.value))}
                  >
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                    <option value={20}>Top 20</option>
                    <option value={999999}>Tất cả</option>
                  </select>
                  <ChevronDown size={13} className="figma-select-arrow" />
                </div>
              </div>
              <div className="figma-scrollable-content">
                {!data ? (
                  <div className="figma-empty-state">
                    <span>--</span>
                  </div>
                ) : (
                  <FigmaHorizontalBarChart items={topBranchBars} theme="blue" />
                )}
              </div>
            </div>

            <div className="figma-card">
              <div className="figma-card-head">
                <div>
                  <h3 className="figma-card-title">Báo cáo tương tác theo chi nhánh</h3>
                  <p className="figma-card-sub">Xem chi tiết số lượt xem theo từng sản phẩm</p>
                </div>
                <div className="figma-card-actions">
                  <div className="figma-card-search">
                    <Search size={14} style={{ color: '#94A3B8' }} />
                    <input
                      type="text"
                      placeholder="Tìm kiếm"
                      value={branchSearch}
                      onChange={(e) => setBranchSearch(e.target.value)}
                    />
                  </div>
                  <div className="figma-select-wrap">
                    <select
                      className="figma-card-select"
                      value={branchLimit}
                      onChange={(e) => setBranchLimit(Number(e.target.value))}
                    >
                      <option value={5}>Top 5</option>
                      <option value={10}>Top 10</option>
                      <option value={20}>Top 20</option>
                      <option value={999999}>Tất cả</option>
                    </select>
                    <ChevronDown size={13} className="figma-select-arrow" />
                  </div>
                </div>
              </div>

              <div className="figma-table-wrap">
                <table className="figma-table">
                  <thead>
                    <tr>
                      <th style={{ width: 65 }}>Thứ hạng</th>
                      <th style={{ width: 110 }}>Mã chi nhánh</th>
                      <th>Tên chi nhánh</th>
                      <th
                        className="sortable"
                        onClick={() => {
                          if (branchSortField === 'accessCount') {
                            setBranchSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
                          } else {
                            setBranchSortField('accessCount');
                            setBranchSortOrder('desc');
                          }
                        }}
                      >
                        <span className="figma-th-inner">
                          <span>Tổng lượt truy cập</span>
                          <ArrowUpDown size={12} className="figma-sort-icon" />
                        </span>
                      </th>
                      <th
                        className="sortable"
                        onClick={() => {
                          if (branchSortField === 'viewCount') {
                            setBranchSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
                          } else {
                            setBranchSortField('viewCount');
                            setBranchSortOrder('desc');
                          }
                        }}
                      >
                        <span className="figma-th-inner">
                          <span>Số người dùng</span>
                          <ArrowUpDown size={12} className="figma-sort-icon" />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data ? (
                      <tr>
                        <td colSpan={5} className="figma-table-empty">
                          --
                        </td>
                      </tr>
                    ) : tableBranches.length > 0 ? (
                      tableBranches.map((b, idx) => (
                        <tr key={b.code || idx}>
                          <td style={{ color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ color: '#475569' }}>{b.code}</td>
                          <td style={{ fontWeight: 500, maxWidth: 300 }}>
                            {b.name}
                          </td>
                          <td>{b.accesses.toLocaleString('vi-VN')}</td>
                          <td>{b.users.toLocaleString('vi-VN')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="figma-table-empty">
                          Không tìm thấy dữ liệu chi nhánh
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Month Detail Popup Modal */}
      {selectedMonthDetail ? (
        <MonthDetailModal
          month={selectedMonthDetail.month}
          year={selectedMonthDetail.year}
          totalViews={selectedMonthDetail.totalViews}
          loading={monthLoading}
          products={monthProducts}
          searchQuery={monthSearch}
          onSearchChange={setMonthSearch}
          onClose={() => setSelectedMonthDetail(null)}
        />
      ) : null}
    </div>
  );
};

export default AccessDataReportPage;
