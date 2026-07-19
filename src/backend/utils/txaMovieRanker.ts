import type { Movie } from '../types/movie';

export class TxaMovieRanker {
  /**
   * Tính điểm xếp hạng xu hướng cho phim
   */
  static calculateScore(movie: Movie): number {
    if (movie.trendingScore !== undefined) {
      return movie.trendingScore;
    }
    // Fallback Cold Start: sử dụng điểm đánh giá IMDb hoặc TMDB
    return (movie.imdbScore || movie.tmdbScore || 8.0) * 10;
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
