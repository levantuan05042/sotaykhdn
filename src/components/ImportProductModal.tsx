import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import './ImportProductModal.css';
import { API_ENDPOINTS } from '../config/apiConfig';

interface ImportProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

type ModalStatus = 'idle' | 'uploading' | 'success' | 'error';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileExtension = (fileName: string): string => {
  const idx = fileName.lastIndexOf('.');
  return idx === -1 ? '' : fileName.slice(idx).toLowerCase();
};

const ImportProductModal: React.FC<ImportProductModalProps> = ({ isOpen, onClose, onImportSuccess }) => {
  // ─── TẤT CẢ HOOKS PHẢI Ở TRÊN CÙNG, TRƯỚC MỌI ĐIỀU KIỆN RETURN ───
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ModalStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
    setIsDragActive(false);
    dragCounterRef.current = 0;
  }, []);

  const handleClose = useCallback(() => {
    if (status === 'uploading') return;
    resetState();
    onClose();
  }, [status, resetState, onClose]);

  const validateFile = useCallback((file: File): string | null => {
    const ext = getFileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) return 'Chỉ hỗ trợ tệp Excel (.xlsx, .xls).';
    if (file.size > MAX_FILE_SIZE) return 'Dung lượng tệp vượt quá 10MB.';
    return null;
  }, []);

  const applySelectedFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setSelectedFile(null);
      setStatus('error');
      setErrorMessage(validationError);
      return;
    }
    setSelectedFile(file);
    setStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
  }, [validateFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applySelectedFile(file);
  }, [applySelectedFile]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDragActive(false);
      dragCounterRef.current = 0;
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applySelectedFile(file);
    e.target.value = '';
  }, [applySelectedFile]);

  const handleRemoveFile = useCallback(() => {
    if (status === 'uploading') return;
    setSelectedFile(null);
    setStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
  }, [status]);

  const triggerFileSelect = useCallback(() => {
    if (status === 'uploading') return;
    fileInputRef.current?.click();
  }, [status]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCT.EXPORT, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'mau_nhap_san_pham.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Lỗi khi tải mẫu Excel:', error);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    setStatus('uploading');
    setUploadProgress(0);
    setErrorMessage('');
    try {
      await axios.post(API_ENDPOINTS.PRODUCT.IMPORT, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });
      setStatus('success');
      setUploadProgress(100);
      closeTimeoutRef.current = setTimeout(() => {
        onImportSuccess();
        resetState();
        onClose();
      }, 1100);
    } catch (error: any) {
      setStatus('error');
      setUploadProgress(0);
      const serverMessage = error?.response?.data?.message;
      setErrorMessage(serverMessage || 'Tải lên thất bại. Kiểm tra lại định dạng tệp và thử lại.');
      console.error('Lỗi khi nhập sản phẩm từ Excel:', error);
    }
  }, [selectedFile, onImportSuccess, resetState, onClose]);

  // useEffect cũng phải nằm trước early return
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // ─── EARLY RETURN SAU KHI ĐÃ GỌI HẾT HOOKS ───────────────────────
  if (!isOpen) return null;

  const isUploadDisabled = !selectedFile || status === 'uploading' || status === 'success';

  return (
    <div
      className="import-modal-overlay"
      onMouseDown={handleClose}
      role="presentation"
    >
      <div
        className="import-modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
      >
        {/* Header */}
        <div className="import-modal-header">
          <h3 id="import-modal-title">Nhập nhiều sản phẩm bằng Excel</h3>
          <button
            className="import-modal-close-btn"
            onClick={handleClose}
            disabled={status === 'uploading'}
            aria-label="Đóng"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="import-modal-body">
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          {!selectedFile ? (
            <div
              className={`import-dropzone ${isDragActive ? 'drag-active' : ''}`}
              onDrop={handleDrop}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
            >
              <div className="import-dropzone-icon">
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="var(--Green-11, #247D5D)" 
                  strokeWidth="2"
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <p className="import-dropzone-text">
                Kéo và thả tệp tại đây hoặc{' '}
                <button type="button" className="import-choose-file-btn" onClick={triggerFileSelect}>
                  Chọn file
                </button>
              </p>
            </div>
          ) : (
            <div className="import-file-card">
              <div className="import-file-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#107C41" />
                  <polyline points="14 2 14 8 20 8" fill="#0B5C30" />
                  <text x="12" y="17" textAnchor="middle" fontSize="6.5" fill="#fff" fontWeight="bold">XLS</text>
                </svg>
              </div>
              <div className="import-file-info">
                <span className="import-file-name">{selectedFile.name}</span>
                <span className="import-file-meta">
                  {formatFileSize(selectedFile.size)}
                  {status === 'uploading' && ` · ${uploadProgress}%`}
                  {status === 'success' && <span className="import-success-text"> · Hoàn tất</span>}
                </span>
                {(status === 'uploading' || status === 'success') && (
                  <div className="import-progress-track">
                    <div
                      className={`import-progress-fill ${status === 'success' ? 'success' : ''}`}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
              {status === 'success' ? (
                <span className="import-status-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="8" fill="#22C55E" />
                    <path d="M5 8.5L7 10.5L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : status !== 'uploading' ? (
                <button
                  className="import-remove-file-btn"
                  onClick={handleRemoveFile}
                  aria-label="Xóa tệp đã chọn"
                  type="button"
                >
                  <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                    <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : null}
            </div>
          )}

          {status === 'error' && (
            <p className="import-error-message">{errorMessage}</p>
          )}
        </div>

        {/* Footer */}
        <div className="import-modal-footer">
          <button className="import-template-link" onClick={handleDownloadTemplate} type="button">
            Tải xuống mẫu excel
          </button>
          <div className="import-modal-actions">
            <button
              className="import-btn-cancel"
              onClick={handleClose}
              disabled={status === 'uploading'}
              type="button"
            >
              Hủy
            </button>
            <button
              className="import-btn-upload"
              onClick={handleUpload}
              disabled={isUploadDisabled}
              type="button"
            >
              {status === 'uploading' ? 'Đang tải lên...' : 'Tải lên'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportProductModal;