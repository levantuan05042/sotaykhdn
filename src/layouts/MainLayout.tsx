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

import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import HeaderBar from '../components/HeaderBar';
import Sidebar from '../components/Sidebar';
import './MainLayout.css';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { AUTH_ME_URL, BEADMIN_USERS_URL } from '../config/apiConfig';

const MainLayout: React.FC = () => {
  useEffect(() => {
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
          localStorage.setItem('userRole', role);

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
      })
      .catch(err => {
        console.error("Failed to fetch user info", err);
      });
  }, []);

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