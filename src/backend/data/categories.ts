import { supabase } from '@lib/supabase';

export interface CategoryDefinition {
  slug: string;
  title: string;
  description?: string;
}

export const HOMEPAGE_CATEGORIES: CategoryDefinition[] = [
  {
    slug: 'top-anime-he',
    title: 'Top Anime Đáng Xem Mùa Hè',
    description: 'Loạt anime gây sốt với đồ họa mãn nhãn, cốt truyện bùng nổ và dàn nhân vật khiến fan phát cuồng.'
  },
  {
    slug: 'top-10-phim-le',
    title: 'Top 10 Phim Lẻ Hay Nhức Nách',
    description: 'Bảng vàng những bộ phim lẻ xuất sắc nhất, xem một lần là nhớ mãi.'
  },
  {
    slug: 'top-10-phim-bo',
    title: 'Top 10 Phim Bộ Hay Nhất',
    description: 'Những series đình đám đủ sức khiến bạn thức trắng chỉ để xem thêm một tập nữa.'
  },
  {
    slug: 'phim-dien-anh-moi',
    title: 'Phim Điện Ảnh Mới Ra Mắt',
    description: 'Bom tấn vừa cập nhật, những tác phẩm đang làm nóng phòng vé và mạng xã hội.'
  },
  {
    slug: 'dahk-o-cho-nay-nay',
    title: 'Điện Ảnh Hồng Kông Ở Chỗ Này Này',
    description: 'Từ xã hội đen, võ thuật đến tâm lý hình sự, tinh hoa điện ảnh Hồng Kông hội tụ tại đây.'
  }
];

export async function getHomepageCategories(): Promise<Record<string, string[]>> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'homepage_categories')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching homepage categories:', error);
    }
    return data?.value || {};
  } catch (err) {
    console.error('Error in getHomepageCategories:', err);
    return {};
  }
}

export async function saveHomepageCategories(mappings: Record<string, string[]>): Promise<void> {
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'homepage_categories',
        value: mappings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error('Error saving homepage categories:', err);
    throw err;
  }
}
