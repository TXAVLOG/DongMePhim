import { LocalMovieProvider } from './providers/LocalMovieProvider';
import type { IMovieProvider, Movie, MovieDetail } from '../types/movie';

// Lựa chọn provider dựa trên biến môi trường ENV. 
const providerType = import.meta.env.PUBLIC_DATA_PROVIDER || 'local';

let movieProvider: IMovieProvider;

if (providerType === 'supabase') {
  // movieProvider = new SupabaseMovieProvider(); // implement later
  movieProvider = new LocalMovieProvider();
} else {
  movieProvider = new LocalMovieProvider();
}

export const MovieService = {
  getMovies: (params?: { type?: 'movie' | 'series' | 'hoathinh' | 'tvshows', category?: string, limit?: number, sortBy?: string }) => movieProvider.getMovies(params),
  getMovieBySlug: (slug: string) => movieProvider.getMovieBySlug(slug),
  getRelatedMovies: (id: string) => movieProvider.getRelatedMovies(id),
  searchMovies: (query: string) => movieProvider.searchMovies(query)
};
