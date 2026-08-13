// import React from 'react';
// import { Outlet } from 'react-router-dom';
// import HeaderBar from '../components/HeaderBar';
// import Sidebar from '../components/Sidebar';
// import './MainLayout.css';
// import { Toaster } from 'react-hot-toast';

// const MainLayout: React.FC = () => {
//   return (
//     <div className="main-layout">
//       <Toaster position="top-right" reverseOrder={false} />
      
//       {/* Header luôn cố định ở đỉnh */}
//       <header className="grid-header">
//         <HeaderBar />
//       </header>

//       {/* Container bọc phần Sidebar và Nội dung */}
//       <div className="grid-container">
        
//         {/* Sidebar dính (sticky) trên màn hình */}
//         <aside className="grid-sidebar">
//           <Sidebar />
//         </aside>

//         {/* Vùng bên phải tự do cao lên theo nội dung */}
//         <main className="grid-content">
//           <div className="page-body">
//             <Outlet /> 
//           </div>
//         </main>
//       </div>

//       {/* Footer nằm ngoài cùng, tự động chiếm 100% chiều ngang */}
//       <footer className="grid-footer">
//         <div className="footer-content">
//           <div>
//             © Bản quyền thuộc Agribank <br />
//             Phiên bản 1.0 cập nhật 04/2026
//           </div>
//           <div className="footer-right">
//             ✉ bannganhangso@agribank.com.vn <br />
//             📞 0123456789 - Văn thư Ban NHS
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// };

// export default MainLayout;

import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import HeaderBar from '../components/HeaderBar';
import Sidebar from '../components/Sidebar';
import './MainLayout.css';
import { Toaster, toast } from 'react-hot-toast';
import axios from 'axios';
import { AUTH_ME_URL, BEADMIN_USERS_URL } from '../config/apiConfig';
import { getAllowedModesForRole } from '../config/menuConfig';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(() => {
    return localStorage.getItem('currentUserRole');
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleRoleChange = () => {
      setCurrentUserRole(localStorage.getItem('currentUserRole'));
    };
    window.addEventListener('userRoleChanged', handleRoleChange);
    return () => {
      window.removeEventListener('userRoleChanged', handleRoleChange);
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    axios.get(AUTH_ME_URL, { withCredentials: true })
      .then(res => {
        if (res.data) {
          const user = res.data;
          const fullName = user.fullName || user.username;
          const branchCode = user.branchCode || '001';
          const username = user.username;
          const role = user.role || 'ETN08';

          // Set into localstorage
          localStorage.setItem('currentUser', `${fullName}_${branchCode}`);
          localStorage.setItem('currentUserUsername', username);
          localStorage.setItem('currentUserFullName', fullName);
          localStorage.setItem('currentUserBranchCode', branchCode);
          localStorage.setItem('currentUserRole', role);

          // Reset userRole/Mode if current mode is not allowed for the user's role
          const allowedModes = getAllowedModesForRole(role);
          let currentMode = localStorage.getItem('userRole') as any;
          if (!currentMode || !allowedModes.includes(currentMode)) {
            currentMode = allowedModes[0];
            localStorage.setItem('userRole', currentMode);
          }

          // Dispatch event so other components (like HeaderBar) update
          window.dispatchEvent(new Event('userRoleChanged'));
          window.dispatchEvent(new Event('currentUserChanged'));

          // Gọi BEAdmin API với actionType=4 lấy danh sách user và lưu sessionStorage
          axios.get(BEADMIN_USERS_URL(username, branchCode))
            .then(usersRes => {
              if (usersRes.data) {
                const rawData = typeof usersRes.data === 'string' ? usersRes.data : JSON.stringify(usersRes.data);
                sessionStorage.setItem('beadminUsers', rawData);
                console.log("Successfully fetched and saved BEAdmin users to sessionStorage");
              }
            })
            .catch(e => {
              console.error("Failed to fetch users from BEAdmin", e);
            });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch user info", err);
        setLoading(false);
      });
  }, []);

  // ROUTE GUARD: Chặn truy cập trái phép trực tiếp qua URL
  useEffect(() => {
    if (!currentUserRole) return;

    const path = location.pathname;
    const isApproverPath = path.startsWith('/approver');

    if (isApproverPath) {
      // Chỉ ESA08 và ETK08 được vào các màn approver
      if (currentUserRole !== 'ESA08' && currentUserRole !== 'ETK08') {
        toast.error("Bạn không có quyền truy cập vào chức năng kiểm duyệt!");
        navigate('/view'); // Chuyển về màn hình tra cứu sản phẩm
      }
    } else {
      // Các màn hình quản trị khác thuộc MainLayout (như quản lý nhóm, quản lý tiêu chí...)
      // Chỉ ESA08 và ETN08 được vào các màn này
      if (currentUserRole !== 'ESA08' && currentUserRole !== 'ETN08') {
        toast.error("Bạn không có quyền truy cập vào chức năng quản lý!");
        navigate('/view'); // Chuyển về màn hình tra cứu sản phẩm
      }
    }
  }, [location.pathname, currentUserRole, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px', background: '#f5f5f5', fontFamily: 'sans-serif' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #ddd', borderTopColor: '#005f57', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <div style={{ color: '#555', fontSize: '15px', fontWeight: 500 }}>Đang tải thông tin người dùng...</div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }


  return (
    <div className="main-layout">
      <Toaster position="top-right" reverseOrder={false} />

      <header className="grid-header">
        <HeaderBar />
      </header>
      <div className="grid-container">
        <aside className="grid-sidebar">
          <Sidebar />
        </aside>
        <main className="grid-content">
          <div className="page-body">
            <Outlet /> 
          </div>
        </main>
      </div>
      <footer className="grid-footer">
        <div className="footer-content">
          <div>
            © Bản quyền thuộc Agribank <br />
            Phiên bản 1.0 cập nhật 04/2026
          </div>
          <div className="footer-right">
            ✉ bannganhangso@agribank.com.vn <br />
            📞 0123456789 - Văn thư Ban NHS
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;