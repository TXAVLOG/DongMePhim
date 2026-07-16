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
    slug: 'viet-nam',
    title: 'Điện Ảnh Việt: Xem Là Cuốn!',
    description: 'Tuyển tập những tác phẩm điện ảnh và truyền hình Việt Nam tiêu biểu, xuất sắc nhất.'
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
  },
  {
    slug: 'toi-so-con-nguoi-em-roi-do',
    title: 'Tôi Sợ Con Người Em Rồi Đó, nhưng Không Bằng Sợ Ma',
    description: 'Tuyển tập phim kinh dị, ma quái giật gân khiến bạn đứng tim từng phút giây.'
  },
  {
    slug: 'phim-thai-new',
    title: 'Phim Thái New: Không Drama Đời Không Nể',
    description: 'Những bộ phim Thái Lan mới nhất đầy kịch tính, drama đỉnh cao và giải trí bùng nổ.'
  },
  {
    slug: 'chau-tinh-tri-xem-la-cuoi',
    title: 'Châu Tinh Trì – Xem Là Phải Cười, Không Cười Là Lỗi Ở Bạn',
    description: 'Tuyển tập hài hước kinh điển của Vua Hài Châu Tinh Trì, xem là cười bể bụng.'
  },
  {
    slug: 'huyen-thoai-co-tich',
    title: 'Cổ Tích & Huyền Thoại - Nghe Phát Nghiện',
    description: 'Tuyển tập những câu chuyện thần kỳ, cổ tích và huyền thoại khiến bạn mê mẩn từ tập đầu tiên.'
  },
  {
    slug: 'thanh-xuan-hoc-duong',
    title: 'Tuổi Học Trò - Thanh Xuân Của Tôi',
    description: 'Những bộ phim tuổi học trò tình cảm trong sáng, những rung động đầu đời ngọt ngào và đầy kỷ niệm.'
  },
  {
    slug: 'do-mat-dem-khuya',
    title: 'Bí Mật Giường Chiếu: Đỏ Mặt Đêm Khuya (18+)',
    description: 'Tuyển tập phim tâm lý tình cảm nóng bỏng, những thước phim chân thực chỉ dành cho khán giả trên 18 tuổi.'
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
