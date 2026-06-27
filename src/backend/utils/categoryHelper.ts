export const SLUG_TO_NAME_MAP: Record<string, string> = {
  // Countries
  'trung-quoc': 'Trung Quốc',
  'han-quoc': 'Hàn Quốc',
  'nhat-ban': 'Nhật Bản',
  'au-my': 'Âu Mỹ',
  'my': 'Mỹ',
  'hong-kong': 'Hồng Kông',
  'dai-loan': 'Đài Loan',
  'thai-lan': 'Thái Lan',
  'viet-nam': 'Việt Nam',
  'tvb': 'TVB',
  'an-do': 'Ấn Độ',
  'anh': 'Anh',
  'phap': 'Pháp',
  'duc': 'Đức',
  'tay-ban-nha': 'Tây Ban Nha',
  'y': 'Ý',
  'nga': 'Nga',
  'uc': 'Úc',
  'canada': 'Canada',
  'khac': 'Khác',

  // Genres
  'hanh-dong': 'Hành Động',
  'tinh-cam': 'Tình Cảm',
  'kinh-di': 'Kinh Dị',
  'hai-huoc': 'Hài Hước',
  'vien-tuong': 'Viễn Tưởng',
  'co-trang': 'Cổ Trang',
  'hoat-hinh': 'Hoạt Hình',
  'tam-ly': 'Tâm Lý',
  'hinh-su': 'Hình Sự',
  'vo-thuat': 'Võ Thuật',
  'hoc-duong': 'Học Đường',
  'phieu-luu': 'Phiêu Lưu',
  'than-thoai': 'Thần Thoại',
  'chien-tranh': 'Chiến Tranh',
  'am-nhac': 'Âm Nhạc',
  'the-thao': 'Thể Thao',
  'gia-dinh': 'Gia Đình',
  'chuyen-the': 'Chuyển Thể',
  'tai-lieu': 'Tài Liệu',
  'bi-an': 'Bí Ẩn',
  'kich-tinh': 'Kịch Tính',
  'trinh-tham': 'Trinh Thám',
  'khoa-hoc': 'Khoa Học',
  'chinh-tri': 'Chính Trị',
  'khoa-hoc-vien-tuong': 'Khoa Học Viễn Tưởng',
  'am-thuc': 'Ẩm Thực',
  'gia-tuong': 'Giả Tưởng',
  'xieu-nhien': 'Siêu Nhiên',
  'tuoi-tre': 'Tuổi Trẻ',
  'doi-song': 'Đời Sống',
  'long-tieng': 'Lồng Tiếng',
  'thuyet-minh': 'Thuyết Minh'
};

export const slugify = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

export function getNameBySlug(slug: string): string {
  if (!slug) return '';
  const cleanSlug = slug.toLowerCase().trim();
  if (SLUG_TO_NAME_MAP[cleanSlug]) {
    return SLUG_TO_NAME_MAP[cleanSlug];
  }
  return cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1).replace(/-/g, ' ');
}
