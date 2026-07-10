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
  country?: string;
  ageRating?: string;
  genres?: string[];
  seasons?: string;
  actors?: string[];
  directors?: string[];
  trailerUrl?: string;
  broadcastSchedule?: BroadcastSchedule;
  updatedAt?: string;
  isStatic?: boolean;
  source?: string;
  require_login?: boolean;
  rating_score?: number;
  rating_count?: number;
  tmdbScore?: number;
  movie_id_seq?: number;
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
  time_intro_start?: number;
  time_intro_end?: number;
  time_outro_start?: number;
  time_outro_end?: number;
  airDate?: string;
  airTime?: string;
  thumbUrl?: string;
  storyboardUrl?: string;
}

export interface MovieDetail extends Movie {
  episodes: {
    serverName: string;
    serverData: Episode[];
  }[];
}

export interface IMovieProvider {
  getMovies(params?: { type?: 'movie' | 'series' | 'hoathinh' | 'tvshows', category?: string, limit?: number, sortBy?: string, slugs?: string[] }): Promise<Movie[]>;
  getMovieBySlug(slug: string): Promise<MovieDetail | null>;
  getRelatedMovies(movieId: string): Promise<Movie[]>;
  searchMovies(query: string): Promise<Movie[]>;
}

