import { supabase } from '@lib/supabase';

export interface ErrorReport {
  id?: string;
  movieTitle: string;
  movieSlug: string;
  episodeName: string;
  episodeSlug: string;
  serverName: string;
  reason: string;
  user: string;
  createdAt?: string;
  status: 'pending' | 'fixing' | 'resolved';
}

export const ErrorReportService = {
  // Lấy toàn bộ danh sách báo cáo lỗi từ Supabase, xếp mới nhất lên đầu
  async getAllReports(): Promise<ErrorReport[]> {
    try {
      const { data, error } = await supabase
        .from('txa_error_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        movieTitle: row.movie_title,
        movieSlug: row.movie_slug,
        episodeName: row.episode_name,
        episodeSlug: row.episode_slug,
        serverName: row.server_name,
        reason: row.reason,
        user: row.user_username,
        createdAt: row.created_at,
        status: row.status as 'pending' | 'fixing' | 'resolved'
      }));
    } catch (e) {
      console.error('Lỗi khi lấy danh sách báo lỗi từ Supabase:', e);
      return [];
    }
  },

  // Cập nhật trạng thái báo cáo lỗi
  async updateReportStatus(id: string, status: 'pending' | 'fixing' | 'resolved'): Promise<void> {
    try {
      const { error } = await supabase
        .from('txa_error_reports')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      console.error('Lỗi khi cập nhật trạng thái báo lỗi:', e);
      throw e;
    }
  },

  // Xóa báo cáo lỗi
  async deleteReport(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('txa_error_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      console.error('Lỗi khi xóa báo lỗi:', e);
      throw e;
    }
  }
};
