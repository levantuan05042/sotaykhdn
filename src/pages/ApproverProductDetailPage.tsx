import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/apiConfig';
import './ApproverProductDetailPage.css';

interface CommentItem {
  id: string;
  author: string;
  avatar: string;
  date: string;
  content: string;
}

interface MockProductDetail {
  id: string;
  batch: string;
  title: string;
  productGroup: string;
  productCategory: string;
  business: string;
  productName: string;
  characteristics: string;
  distributionChannel: string;
  guidelineDocument: string;
  utilities: string;
  displayStatus: string;
  comments: CommentItem[];
}

const MOCK_DETAILS_MAP: Record<string, MockProductDetail> = {
  '1': {
    id: '1',
    batch: 'Lô 1250384',
    title: 'Sản phẩm cho vay',
    productGroup: 'Sản phẩm Cho vay',
    productCategory: 'Tài khoản thanh toán',
    business: 'Tài khoản thanh toán',
    productName: 'Tài khoản thanh toán',
    characteristics: `* Đặc tính chung:
- Kỳ hạn gửi: Không kỳ hạn
- Đồng tiền: VND và ngoại tệ
- Số dư tối thiểu: Đối với khách hàng tổ chức
+ Số dư tối thiểu bằng VND: 1.000.000 đồng (Một triệu đồng).
+ Số dư tối thiểu bằng ngoại tệ: 100 đơn vị tiền tệ (Ví dụ: 100 USD, 100 EUR, v.v...).
- Gửi và rút:
+ Gửi: KH gửi tiền nhiều lần vào TK tại quầy giao dịch/CDM, chuyển khoản qua ATM/CDM, trên kênh điện tử, Ủy nhiệm chi...
+ Rút: KH rút tiền nhiều lần bằng các phương tiện thanh toán.
- Phí và lãi:
+ Phí: Phí dịch vụ áp dụng theo biểu phí hiện hành của Agribank
+ Lãi suất: Lãi suất thả nổi.
* Cách tính và lãi: Trả lãi theo định kỳ hàng tháng vào tài khoản TGTT của khách hàng theo hình thức lãi nhập gốc. Agribank không tính và trả lãi trường hợp số dư bình quân tháng trên tài khoản TGTT nhỏ hơn số dư tối thiểu.`,
    distributionChannel: 'Giao dịch lần đầu trực tiếp tại quầy, các lần tiếp theo có thể thực hiện trên nhiều kênh: ATM/CDM; kênh điện tử',
    guidelineDocument: 'Quy định số 3325/QyĐ-NHNo-TCKT ngày 30/9/2024 của Tổng Giám đốc về mở và sử dụng tài khoản thanh toán.',
    utilities: `- Không giới hạn số lần gửi, rút tại bất kỳ thời điểm nào dưới nhiều hình thức;
- Sử dụng để thanh toán, chuyển khoản, thực hiện các giao dịch thanh toán không dùng tiền mặt;
- Bảo mật số dư tiền gửi;
- Dịch vụ thông tin tài khoản qua Mobile Banking, Internet Banking.
- Chủ tài khoản thanh toán được ủy quyền trong sử dụng tài khoản thanh toán của mình theo quy định của pháp luật.
- Chủ tài khoản được yêu cầu Agribank thực hiện các lệnh thanh toán hợp pháp, hợp lệ và được cung cấp thông tin về số dư và các giao dịch phát sinh trên tài khoản thanh toán của mình theo thỏa thuận với Agribank.
- Được hưởng lãi suất tiền gửi không kỳ hạn áp dụng cho tài khoản thanh toán theo quy định của Agribank.`,
    displayStatus: 'Ẩn',
    comments: [
      {
        id: 'c1',
        author: 'Nguyễn Hải Long',
        avatar: 'https://scontent-hkg1-2.xx.fbcdn.net/v/t39.30808-1/496859882_2213309762459479_7876539183003247432_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=107&ccb=1-7&_nc_sid=e99d92',
        date: '11/04/2026',
        content: 'Thiếu tên sản phẩm, mã sản phẩm. Thêm nhiều nội dung hơn cho phần tiêu chí "Kênh phân phối"'
      },
      {
        id: 'c2',
        author: 'Nguyễn Hải Long',
        avatar: 'https://scontent-hkg1-2.xx.fbcdn.net/v/t39.30808-1/496859882_2213309762459479_7876539183003247432_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=107&ccb=1-7&_nc_sid=e99d92',
        date: '11/04/2026',
        content: 'Thiếu tên sản phẩm, mã sản phẩm. Thêm nhiều nội dung hơn cho phần tiêu chí "Kênh phân phối"'
      }
    ]
  },
  '2': {
    id: '2',
    batch: 'Lô 1250385',
    title: 'Danh mục huy động vốn',
    productGroup: 'Sản phẩm Huy động',
    productCategory: 'Tiền gửi tiết kiệm',
    business: 'Huy động vốn doanh nghiệp',
    productName: 'Tiền gửi có kỳ hạn',
    characteristics: `* Đặc tính chung:
- Kỳ hạn gửi: Từ 1 tháng đến 36 tháng
- Đồng tiền: VND, USD, EUR
- Số dư tối thiểu: 50.000.000 VND hoặc 2.000 USD.
- Gửi tiền một lần, rút một lần hoặc nhiều lần theo quy định.`,
    distributionChannel: 'Mở trực tiếp tại các phòng giao dịch/chi nhánh Agribank trên toàn quốc.',
    guidelineDocument: 'Quy định số 1024/QyĐ-NHNo-TCKT ngày 15/5/2025 về tiền gửi tiết kiệm.',
    utilities: `- Lãi suất cạnh tranh cố định theo kỳ hạn;
- Cầm cố thẻ tiết kiệm để vay vốn khi có nhu cầu;
- Bảo mật thông tin số dư tuyệt đối.`,
    displayStatus: 'Ẩn',
    comments: [
      {
        id: 'c3',
        author: 'Nguyễn Hải Long',
        avatar: 'https://scontent-hkg1-2.xx.fbcdn.net/v/t39.30808-1/496859882_2213309762459479_7876539183003247432_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=107&ccb=1-7&_nc_sid=e99d92',
        date: '12/04/2026',
        content: 'Vui lòng bổ sung biểu phí rút trước hạn.'
      }
    ]
  }
};

const getFallbackDetail = (id: string): MockProductDetail => ({
  id,
  batch: `Lô 125038${id}`,
  title: `Sản phẩm yêu cầu số ${id}`,
  productGroup: 'Sản phẩm Cho vay',
  productCategory: 'Tài khoản thanh toán',
  business: 'Tài khoản thanh toán',
  productName: 'Sản phẩm dịch vụ mẫu',
  characteristics: `* Đặc tính mẫu của sản phẩm:
- Kỳ hạn: Không kỳ hạn
- Loại tiền tệ áp dụng: VND
- Hạn mức tối thiểu: 1.000.000 VND`,
  distributionChannel: 'Hệ thống quầy giao dịch và ứng dụng ngân hàng số Agribank.',
  guidelineDocument: 'Văn bản hướng dẫn số 9999/QyĐ-NHNo của Tổng Giám đốc.',
  utilities: `- Thanh toán tiện lợi
- Hỗ trợ trực tuyến 24/7`,
  displayStatus: 'Ẩn',
  comments: []
});

interface EditorBlockProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

const EditorBlock: React.FC<EditorBlockProps> = ({ label, value, onChange }) => {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="editor-container">
        <div className="editor-toolbar">
          <div className="editor-tool-group">
            <button type="button" className="btn-tool" style={{ fontWeight: 'bold' }}>B</button>
            <button type="button" className="btn-tool" style={{ fontStyle: 'italic' }}>I</button>
            <button type="button" className="btn-tool" style={{ textDecoration: 'underline' }}>U</button>
          </div>
          <div className="editor-tool-separator" />
          <div className="editor-tool-group">
            <button type="button" className="btn-tool">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="21" y1="10" x2="3" y2="10"></line>
                <line x1="21" y1="6" x2="3" y2="6"></line>
                <line x1="21" y1="14" x2="3" y2="14"></line>
                <line x1="21" y1="18" x2="3" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="editor-tool-separator" />
          <div className="editor-tool-group">
            <button type="button" className="btn-tool">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
            <button type="button" className="btn-tool">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="10" y1="6" x2="21" y2="6"></line>
                <line x1="10" y1="12" x2="21" y2="12"></line>
                <line x1="10" y1="18" x2="21" y2="18"></line>
                <path d="M4 6h1v4"></path>
                <path d="M4 10h2"></path>
                <path d="M6 6H4"></path>
              </svg>
            </button>
          </div>
        </div>
        <textarea
          className="editor-textarea"
          rows={10}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
};

interface ApproverProductDetailPageProps {
  requestId?: string;
  onClose?: (updatedData?: { notes: string | null; feedback: string }) => void;
  initialNotes?: string | null;
  initialFeedback?: string;
  isModal?: boolean;
}

const ApproverProductDetailPage: React.FC<ApproverProductDetailPageProps> = ({ requestId: propRequestId, onClose, initialNotes, initialFeedback, isModal = false }) => {
  const { requestId: routeRequestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const activeRequestId = propRequestId || routeRequestId || '1';

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [productGroups, setProductGroups] = useState<any[]>([]);

  useEffect(() => {
    if (!activeRequestId) return;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const response = await axios.get(API_ENDPOINTS.PRODUCT.DETAIL(activeRequestId));
        const data = response.data;
        if (initialNotes !== undefined) {
          data.notes = initialNotes;
        }
        setDetail(data);
        if (initialFeedback !== undefined) {
          setNewComment(initialFeedback);
        }
      } catch (error) {
        console.error("Error fetching product detail:", error);
        toast.error("Không thể tải chi tiết sản phẩm!");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [activeRequestId, initialNotes, initialFeedback]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.PRODUCT_CATEGORY.LIST);
        setCategories(response.data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    const fetchProductGroups = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST);
        setProductGroups(response.data);
      } catch (error) {
        console.error("Error fetching product groups:", error);
      }
    };
    fetchCategories();
    fetchProductGroups();
  }, []);

  useEffect(() => {
    if (!detail?.productCategoryId) {
      setBusinesses([]);
      return;
    }
    const fetchBusinesses = async () => {
      try {
        const response = await axios.get(`${API_ENDPOINTS.PRODUCT_BUSINESS.LIST}?categoryIds=${detail.productCategoryId}`);
        setBusinesses(response.data);
      } catch (error) {
        console.error("Error fetching businesses:", error);
      }
    };
    fetchBusinesses();
  }, [detail?.productCategoryId]);

  const handleFieldChange = (key: string, value: any) => {
    setDetail((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: value
      };
    });
  };

  const handleCriteriaChange = (criteriaId: string, value: string) => {
    setDetail((prev: any) => {
      if (!prev) return prev;
      const updatedDetails = prev.details?.map((d: any) =>
        d.id === criteriaId ? { ...d, noiDung: value } : d
      );
      return {
        ...prev,
        details: updatedDetails
      };
    });
  };

  const handleBack = () => {
    if (onClose) {
      onClose({
        notes: detail?.notes || null,
        feedback: newComment
      });
    } else {
      navigate(-1);
    }
  };

  const handleSaveReview = (notesVal: string) => {
    const label = notesVal === '0' ? 'Yêu cầu chỉnh sửa' : 'Từ chối';
    toast.success(`Đã chọn trạng thái: ${label} (Nhấn Duyệt / Lưu ở màn ngoài để lưu chính thức)`);

    setDetail((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        notes: notesVal
      };
    });
  };

  if (loading || !detail) {
    return (
      <div className={`single-product-detail-page ${isModal ? 'is-modal' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div className="quickview-loading-card">
          Đang tải chi tiết sản phẩm...
        </div>
      </div>
    );
  }

  return (
    <div className={`single-product-detail-page ${isModal ? 'is-modal' : ''}`}>
      <Toaster position="top-right" />

      {/* HEADER BAR */}
      <header className="detail-header shadow-sm">
        <div className="header-left">
          <button className="btn-back" onClick={handleBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Quay lại</span>
          </button>
          <div className="header-separator" />
          <h2 className="breadcrumb-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#595959' }}>Lô {detail.requestName || '1250384'}</span>
            <span style={{ color: '#8c8c8c', fontSize: '14px' }}>&rsaquo;</span>
            <span className="breadcrumb-active" style={{ fontWeight: 600 }}>{detail.name}</span>
          </h2>
        </div>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="header-notes-label" style={{ fontSize: '13px', color: '#595959', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Trạng thái:</span>
            {detail.notes === '0' && (
              <span className="note-badge note-badge--revision" style={{ padding: '4px 10px', fontSize: '12px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
                Yêu cầu chỉnh sửa
              </span>
            )}
            {detail.notes === '1' && (
              <span className="note-badge note-badge--rejected" style={{ padding: '4px 10px', fontSize: '12px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
                Từ chối
              </span>
            )}
            {detail.notes === '2' && (
              <span className="note-badge note-badge--approved" style={{ padding: '4px 10px', fontSize: '12px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Đã duyệt
              </span>
            )}
            {!['0', '1', '2'].includes(detail.notes) && '—'}
          </span>
          {(detail.status === 'PENDING_APPROVAL' || detail.requestStatus === 'PENDING_APPROVAL') && (
            <>
              <button 
                className="btn-reject" 
                onClick={() => handleSaveReview('1')} 
                style={{ backgroundColor: '#ffffff', color: '#262626', border: '1px solid #d9d9d9', padding: '8px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Từ chối
              </button>
              <button 
                className="btn-revision-request-yellow" 
                onClick={() => handleSaveReview('0')} 
                disabled={!newComment.trim()}
                style={{ 
                  backgroundColor: newComment.trim() ? '#FEF08A' : '#F5F5F5', 
                  color: newComment.trim() ? '#854D0E' : '#BFBFBF', 
                  border: newComment.trim() ? '1px solid #FEF08A' : '1px solid #D9D9D9', 
                  padding: '8px 24px', 
                  borderRadius: '6px', 
                  cursor: newComment.trim() ? 'pointer' : 'not-allowed', 
                  fontWeight: 600 
                }}
              >
                Yêu cầu chỉnh sửa
              </button>
            </>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="detail-main-container">
        
        {/* LEFT COLUMN: FORM */}
        <section className="detail-left-panel">
          
          <div className="form-group">
            <label className="form-label">
              Nhóm sản phẩm <span className="form-label-required">(*)</span>
            </label>
            <select
              className="form-select"
              value={detail.productGroupId || ''}
              disabled
              onChange={(e) => {
                const grpId = e.target.value;
                const grpName = productGroups.find(g => g.id === grpId)?.name || '';
                setDetail((prev: any) => ({
                  ...prev,
                  productGroupId: grpId,
                  productGroupName: grpName
                }));
              }}
            >
              <option value="">Chọn nhóm sản phẩm</option>
              {productGroups.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label className="form-label">Danh mục sản phẩm</label>
              <select
                className="form-select"
                value={detail.productCategoryId || ''}
                disabled
                onChange={(e) => {
                  const catId = e.target.value;
                  const catName = categories.find(c => c.id === catId)?.name || '';
                  setDetail((prev: any) => ({
                    ...prev,
                    productCategoryId: catId,
                    productCategoryName: catName,
                    businessId: '', // Reset business when category changes
                    businessName: ''
                  }));
                }}
              >
                <option value="">Chọn danh mục sản phẩm</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nghiệp vụ</label>
              <select
                className="form-select"
                value={detail.businessId || ''}
                disabled
                onChange={(e) => {
                  const busId = e.target.value;
                  const busName = businesses.find(b => b.id === busId)?.name || '';
                  setDetail((prev: any) => ({
                    ...prev,
                    businessId: busId,
                    businessName: busName
                  }));
                }}
              >
                <option value="">Chọn nghiệp vụ</option>
                {businesses.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Tên sản phẩm dịch vụ <span className="form-label-required">(*)</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={detail.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
            />
          </div>

          {/* Dynamic Criteria Fields */}
          {detail.details?.map((item: any, index: number) => (
            <EditorBlock
              key={item.criteriaId || index}
              label={`${item.tieuChi} ${item.isRequired ? '(*)' : ''}`}
              value={item.noiDung || ''}
              onChange={(val) => handleCriteriaChange(item.id || item.criteriaId, val)}
            />
          ))}

          {/* Last Field: Product Image */}
          {detail.imageUrl && (
            <div className="form-group">
              <label className="form-label">Ảnh sản phẩm</label>
              <div className="quickview-image-container" style={{ width: '100%', boxSizing: 'border-box' }}>
                <img 
                  src={new URL(`../assets/${detail.imageUrl}`, import.meta.url).href}
                  alt="Ảnh sản phẩm" 
                  className="quickview-product-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

        </section>

        {/* RIGHT COLUMN: INFO PANEL & COMMENTS */}
        <section className="detail-right-panel">
          
          {/* Trạng thái hiển thị */}
          <div className="right-card shadow-sm">
            <h3 className="right-card-title">
              Trạng thái hiển thị
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </h3>
            <select
              className="form-select"
              value={detail.active ? 'Hiển thị' : 'Ẩn'}
              disabled
              onChange={(e) => handleFieldChange('active', e.target.value === 'Hiển thị')}
            >
              <option value="Ẩn">Ẩn</option>
              <option value="Hiển thị">Hiển thị</option>
            </select>
          </div>

          {/* Thông tin sản phẩm */}
          <div className="right-card shadow-sm" style={{ marginTop: '16px' }}>
            <h3 className="right-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Thông tin sản phẩm</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </h3>
            <div className="product-meta-grid" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              padding: '16px',
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              marginTop: '10px'
            }}>
              <div className="meta-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="meta-label" style={{ fontSize: '11px', color: '#737373' }}>Người tạo</span>
                <span className="meta-value" style={{ fontSize: '13px', fontWeight: 600, color: '#171717' }}>{detail.createdBy || '—'}</span>
              </div>
              <div className="meta-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="meta-label" style={{ fontSize: '11px', color: '#737373' }}>Người kiểm duyệt</span>
                <span className="meta-value" style={{ fontSize: '13px', fontWeight: 600, color: '#171717' }}>{detail.approvedBy || '—'}</span>
              </div>
              <div className="meta-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="meta-label" style={{ fontSize: '11px', color: '#737373' }}>Thời gian tạo</span>
                <span className="meta-value" style={{ fontSize: '13px', fontWeight: 600, color: '#171717' }}>
                  {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString('vi-VN') : '—'}
                </span>
              </div>
              <div className="meta-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="meta-label" style={{ fontSize: '11px', color: '#737373' }}>Phiên bản</span>
                <span className="version-tag" style={{
                  backgroundColor: '#DEF7EC',
                  color: '#03543F',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  alignSelf: 'flex-start',
                  marginTop: '2px'
                }}>Phiên bản {detail.version || 1}</span>
              </div>
            </div>
          </div>

          {/* Bình luận */}
          <div className="comments-container shadow-sm" style={{ marginTop: '16px' }}>
            <h2 className="comments-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleX(-1)' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>Bình luận</span>
            </h2>

            <div className="comments-list">
              {detail.comments && detail.comments.map((comment: any) => {
                const dateStr = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('vi-VN') : '—';
                return (
                  <div className="comment-item" key={comment.id}>
                    <div className="comment-meta">
                      <div className="comment-avatar">
                        <img src="https://scontent-hkg1-2.xx.fbcdn.net/v/t39.30808-1/496859882_2213309762459479_7876539183003247432_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=107&ccb=1-7&_nc_sid=e99d92" alt="Avatar" />
                      </div>
                      <div className="comment-author-info">
                        <span className="comment-author">{comment.createdBy || 'Cán bộ duyệt'}</span>
                        <span className="comment-date">{dateStr}</span>
                      </div>
                    </div>
                    <div className="comment-body">
                      {comment.comment}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="comment-input-area">
              <textarea
                className="comment-textarea"
                rows={3}
                placeholder="Nhập nội dung phản hồi mới..."
                value={newComment}
                disabled={detail.status !== 'PENDING_APPROVAL' && detail.requestStatus !== 'PENDING_APPROVAL'}
                onChange={(e) => setNewComment(e.target.value)}
              />
            </div>
          </div>

        </section>

      </main>
    </div>
  );
};

export default ApproverProductDetailPage;
