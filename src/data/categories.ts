import { supabase } from '../lib/supabase';

export interface CategoryDefinition {
  slug: string;
  title: string;
  description?: string;
}

export const HOMEPAGE_CATEGORIES: CategoryDefinition[] = [
  {
    slug: 'top-anime-he',
    title: 'Top Anime đáng xem mùa hè này',
    description: 'Danh sách các bộ anime hot nhất mùa hè này không thể bỏ lỡ.'
  },
  {
    slug: 'top-10-phim-le',
    title: 'Top 10 Phim Lẻ Hay Nhức Nách',
    description: 'Bảng xếp hạng 10 phim lẻ được xem nhiều và đánh giá cao.'
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
