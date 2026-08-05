import React, { useState, useEffect } from 'react';

interface Approver {
  username: string;
  fullname: string;
  groupCode: string;
}

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedUsername: string) => void;
  allowedGroupCodes: string[];
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({ isOpen, onClose, onConfirm, allowedGroupCodes }) => {
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      try {
        const rawUsers = sessionStorage.getItem('beadminUsers') || sessionStorage.getItem('headminUsers');
        if (rawUsers) {
          const parsedUsers = JSON.parse(rawUsers);
          const userList = Array.isArray(parsedUsers) ? parsedUsers : (parsedUsers.listUser || []);
          
          const filtered = userList.filter((u: any) => allowedGroupCodes.includes(u.groupCode));
          
          setApprovers(filtered);
          if (filtered.length > 0) {
            setSelectedUser(filtered[0].username);
          }
        }
      } catch (e) {}
    }
  }, [isOpen, allowedGroupCodes]);

  const getRoleTitle = (groupCode: string) => {
    if (groupCode === 'ETK08') return 'Người kiểm duyệt';
    if (groupCode === 'ESA08') return 'SuperAdmin';
    return groupCode;
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={contentStyle}>
        <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          Chọn người phê duyệt
        </h3>
        
        <div style={{ maxHeight: '300px', overflowY: 'auto', margin: '16px 0' }}>
          {approvers.length > 0 ? (
            approvers.map((user) => (
              <label key={user.username} style={radioLabelStyle}>
                <input 
                  type="radio" 
                  name="approver" 
                  value={user.username} 
                  checked={selectedUser === user.username}
                  onChange={() => setSelectedUser(user.username)}
                  style={{ marginRight: '10px' }}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>{user.fullname}</div>
                  <div style={{ fontSize: '13px', color: '#333', fontWeight: 400 }}>Tài khoản: {user.username}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Chức vụ: {getRoleTitle(user.groupCode)}</div>
                </div>
              </label>
            ))
          ) : (
            <div style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>
              Không tìm thấy người phê duyệt phù hợp.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={btnCancelStyle}>Hủy</button>
          <button 
            onClick={() => onConfirm(selectedUser)} 
            disabled={!selectedUser}
            style={selectedUser ? btnConfirmStyle : btnDisabledStyle}
          >
            Xác nhận gửi
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 };
const contentStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%' };
const radioLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '10px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer' };
const btnCancelStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer' };
const btnConfirmStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#AE1C3F', color: '#fff', cursor: 'pointer' };
const btnDisabledStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#ccc', color: '#fff', cursor: 'not-allowed' };

export default ApprovalModal;