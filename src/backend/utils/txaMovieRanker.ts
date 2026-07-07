import type { Movie } from '../types/movie';

export class TxaMovieRanker {
  /**
   * Tính điểm xếp hạng cho phim theo công thức:
   * Score = (số đánh giá + điểm đánh giá + lượt view) / (số bình luận + 1) * 100
   */
  static calculateScore(movie: Movie): number {
    const ratingsCount = movie.rating_count || 0; // số lượt đánh giá
    const ratingScore = movie.rating_score || movie.imdbScore || 8.0; // điểm đánh giá (có thập phân)
    const views = movie.views || 0; // lượt view
    const comments = movie.commentCount || 0; // số bình luận

    const score = ((ratingsCount + ratingScore + views) / (comments + 1)) * 100;
    return score;
  }

  /**
   * Sắp xếp danh sách phim theo điểm giảm dần.
   * Nếu các số liệu là 0 (điểm bằng nhau hoặc bằng 0) thì ưu tiên phim mới nhất.
   */
  static sortMovies(movies: Movie[]): Movie[] {
    return [...movies].sort((a, b) => {
      const scoreA = this.calculateScore(a);
      const scoreB = this.calculateScore(b);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      // Fallback: ưu tiên mới nhất (updatedAt hoặc releaseYear)
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;

      return (b.releaseYear || 0) - (a.releaseYear || 0);
    });
  }
}
