export interface Subtitle {
  label: string;
  file: string;
  kind?: string;
  default?: boolean;
}

export interface BroadcastSchedule {
  nextDate?: string;
  nextTime?: string;
  notice?: string;
}

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  slug: string;
  description: string;
  posterUrl: string;
  bannerUrl: string;
  releaseYear: number;
  durationMinutes: string;
  type: 'movie' | 'series' | 'hoathinh' | 'tvshows';
  status: 'ongoing' | 'completed';
  episodeCurrent: string;
  episodeTotal: string;
  quality: string;
  lang: string;
  imdbScore?: number;
  views?: number;
  commentCount?: number;
  category?: string;
  ageRating?: string;
  genres?: string[];
  seasons?: string;
  actors?: string[];
  directors?: string[];
  trailerUrl?: string;
  broadcastSchedule?: BroadcastSchedule;
  updatedAt?: string;
}

export interface Episode {
  name: string;
  slug: string;
  filename: string;
  linkEmbed: string;
  linkM3u8: string;
  subtitles?: Subtitle[];
  timeIntroStart?: number;
  timeIntroEnd?: number;
  timeOutroStart?: number;
  timeOutroEnd?: number;
  airDate?: string;
  airTime?: string;
}

export interface MovieDetail extends Movie {
  episodes: {
    serverName: string;
    serverData: Episode[];
  }[];
}

export interface IMovieProvider {
  getMovies(params?: { type?: 'movie' | 'series' | 'hoathinh' | 'tvshows', category?: string, limit?: number, sortBy?: string }): Promise<Movie[]>;
  getMovieBySlug(slug: string): Promise<MovieDetail | null>;
  getRelatedMovies(movieId: string): Promise<Movie[]>;
  searchMovies(query: string): Promise<Movie[]>;
}

