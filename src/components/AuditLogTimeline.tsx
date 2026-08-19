import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/apiConfig';
import './AuditLogTimeline.css';

export interface AuditLogItem {
  id: number;
  logCode: string;
  moduleCode: string;
  objectCode: string;
  logColor: string;
  label: string;
  description: string;
  performedBy: string;
  userRole: string;
  logDatetime: string;
}

interface AuditLogTimelineProps {
  objectCode?: string;
  logs?: AuditLogItem[];
}

export const AuditLogTimeline: React.FC<AuditLogTimelineProps> = ({ objectCode, logs: propsLogs }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>(propsLogs || []);
  const [loading, setLoading] = useState<boolean>(!propsLogs && !!objectCode);

  useEffect(() => {
    if (propsLogs) {
      setLogs(propsLogs);
      return;
    }

    if (!objectCode) return;

    setLoading(true);
    axios.get(API_ENDPOINTS.LOGS.GET_BY_OBJECT(objectCode))
      .then((res) => {
        setLogs(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching audit logs:', err);
        setLogs([]);
        setLoading(false);
      });
  }, [objectCode, propsLogs]);

  const formatLogTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      return `Thời gian: ${hours}:${minutes} - ${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  if (loading) {
    return <div className="audit-timeline-loading">Đang tải lưu vết...</div>;
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="audit-timeline-card shadow-sm">
        {/* <h3 className="audit-timeline-title">Lịch sử lưu vết</h3> */}
        <div className="audit-timeline-empty">Chưa có thông tin lưu vết.</div>
      </div>
    );
  }

  return (
    <div className="audit-timeline-card shadow-sm">
      {/* <h3 className="audit-timeline-title">Lịch sử lưu vết</h3> */}

      <div className="audit-timeline-list">
        {logs.map((item, index) => {
          const dotColor = item.logColor || '#3B82F6';
          const timeText = formatLogTime(item.logDatetime);

          return (
            <div className="audit-timeline-item" key={item.id || index}>
              {/* Left timeline line & dot */}
              <div className="audit-timeline-left">
                <div
                  className="audit-timeline-dot"
                  style={{ backgroundColor: dotColor, boxShadow: `0 0 0 3px ${dotColor}33` }}
                />
                {index < logs.length - 1 && <div className="audit-timeline-line" />}
              </div>

              {/* Middle content: Label & Subtext */}
              <div className="audit-timeline-middle">
                <div className="audit-timeline-label">{item.label}</div>
                <div className="audit-timeline-desc">
                  {item.description && item.description.includes(' .Bản ') ? (
                    <>
                      {item.description.split(' .Bản ')[0]} .
                      <span className="audit-timeline-version-tag"> Phiên bản {item.description.split(' .Bản ')[1]}</span>
                    </>
                  ) : (
                    item.description
                  )}
                </div>
              </div>

              {/* Right side: Timestamp */}
              <div className="audit-timeline-right">
                <span className="audit-timeline-time">{timeText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditLogTimeline;
