import React from 'react';
import logoAgribank from '../assets/logo-agribank.png';
import './HeaderBar.css'; // Import file CSS vừa tạo

const HeaderBar: React.FC = () => {
  return (
    <header className="header-container">
      {/* Khối bên trái */}
      <div className="flex items-center">
        <img 
          src={logoAgribank} 
          alt="Logo Agribank" 
          className="w-[70px] h-[70px] rounded-[7px] object-contain" 
        />
        <div className="ml-3 flex flex-col justify-center h-[70px]">
          <h1 className="header-title">
            Sổ tay sản phẩm dịch vụ <br />
            Khách hàng doanh nghiệp
          </h1>
        </div>
      </div>

      {/* Khối bên phải */}
      <div className="flex items-center space-x-6">
        <button className="notification-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M13.73 21C13.5542 21.3031 13.3018 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" 
              stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="flex items-center space-x-4">
          <div className="text-right flex flex-col justify-center self-stretch">
            <p className="user-name">Phạm Thùy Linh</p>
            <p className="user-role">Quản trị nội dung</p>
          </div>
          <div className="avatar-container">
            <img 
              src="https://scontent-hkg1-2.xx.fbcdn.net/v/t39.30808-1/496859882_2213309762459479_7876539183003247432_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=107&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeElV1lB8lxE-Jl95Brt5yL0LdMbKgfDiPot0xsqB8OI-kQvt-NXlC2_iQ2LpjOlsP_Sj8JB4tlBq6Qh5qcQD-aq&_nc_ohc=B9tUax_rWcUQ7kNvwGbtNW8&_nc_oc=Ado2VW0tNyfSJvCs3OCpA8USP2wUqKSgB_pesbBXYXzije1mYwA01dv_Go9XPC3JRu1wWgwHPm4Vw404DpcFzxqm&_nc_zt=24&_nc_ht=scontent-hkg1-2.xx&_nc_gid=hdKbd8IqLtAGg9csLT1Atg&_nc_ss=7b2a8&oh=00_Af6Qe-5KSfSnIshr1ykW4CWS0M9GhucP97bQF2jEdMqaYg&oe=6A09D4B9" 
              alt="Avatar" 
              className="avatar-img" 
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;