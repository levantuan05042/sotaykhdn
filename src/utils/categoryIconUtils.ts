import iconHuyDongVon from '../assets/icons/san-pham-huy-dong-von.svg';
import iconChoVay from '../assets/icons/sp-cho-vay.svg';
import iconBaoLanh from '../assets/icons/sp-bao-lanh.svg';
import iconThanhToanTrongNuoc from '../assets/icons/sp-thanh-toan-trong-nuoc.svg';
import iconKinhDoanhNgoaiTe from '../assets/icons/sp-kinh-doanh-ngoai-te.svg';
import iconThanhToanQuocTe from '../assets/icons/sp-thanh-toan-quoc-te.svg';
import iconThe from '../assets/icons/sp-the.svg';
import iconNganHangDienTu from '../assets/icons/sp-ngan-hang-dien-tu.svg';
import iconNganQuy from '../assets/icons/sp-ngan-quy.svg';
import iconBaoHiem from '../assets/icons/sp-bao-hiem.svg';
import iconChuongTrinhUuDai from '../assets/icons/uu-dai-khdn.svg';

export interface CategoryDesignConfig {
  icon: string | null;
  bgColor: string;
  iconColor: string;
}

export const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

export const getCategoryConfig = (itemName: string): CategoryDesignConfig => {
  const cleanName = removeAccents((itemName || '').toLowerCase().trim());

  if (cleanName.includes('quoc te')) {
    return { icon: iconThanhToanQuocTe, bgColor: '#FDF2F5', iconColor: '#C03254' };
  }
  if (cleanName.includes('cho vay')) {
    return { icon: iconChoVay, bgColor: '#E6F7F6', iconColor: '#11817A' };
  }
  if (cleanName.includes('ngan quy')) {
    return { icon: iconNganQuy, bgColor: '#FDF2EA', iconColor: '#B96D46' };
  }
  if (cleanName.includes('bao lanh')) {
    return { icon: iconBaoLanh, bgColor: '#ECF9F1', iconColor: '#2E7D52' };
  }
  if (cleanName.includes('bao hiem')) {
    return { icon: iconBaoHiem, bgColor: '#FEF7E6', iconColor: '#B48C2B' };
  }
  if (cleanName.includes('trong nuoc') || cleanName.includes('thanh toan')) {
    return { icon: iconThanhToanTrongNuoc, bgColor: '#ECF9EE', iconColor: '#388E3C' };
  }
  if (cleanName.includes('the')) {
    return { icon: iconThe, bgColor: '#F0F1FB', iconColor: '#3F51B5' };
  }
  if (cleanName.includes('dien tu')) {
    return { icon: iconNganHangDienTu, bgColor: '#F5F0FB', iconColor: '#7B1FA2' };
  }
  if (cleanName.includes('huy dong')) {
    return { icon: iconHuyDongVon, bgColor: '#E5F8F6', iconColor: '#00897B' };
  }
  if (cleanName.includes('uu dai')) {
    return { icon: iconChuongTrinhUuDai, bgColor: '#FCEEF0', iconColor: '#C02242' };
  }
  if (cleanName.includes('ngoai te')) {
    return { icon: iconKinhDoanhNgoaiTe, bgColor: '#FDF2EA', iconColor: '#B96D46' };
  }

  return { icon: null, bgColor: '#F3F4F6', iconColor: '#6B7280' };
};
