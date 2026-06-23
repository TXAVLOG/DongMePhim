import { SettingService } from './SettingService';

export class ActorCrawlerService {
  static async searchMoviesByActor(actorName: string): Promise<any[]> {
    try {
      const settings = await SettingService.getSettings();
      const apiKey = (settings.general as any).tmdb_api_key || '211be8d45c0d31404f644ecdcf9caad5';

      // 1. Search for person on TMDB to get their ID
      const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(actorName)}&language=vi-VN`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) return [];
      
      const searchData = await searchRes.json() as any;
      const bestMatch = searchData.results?.[0];
      if (!bestMatch) return [];

      const actorId = bestMatch.id;

      // 2. Fetch credits (movies & TV shows)
      const creditsUrl = `https://api.themoviedb.org/3/person/${actorId}/combined_credits?api_key=${apiKey}&language=vi-VN`;
      const creditsRes = await fetch(creditsUrl);
      if (!creditsRes.ok) return [];

      const creditsData = await creditsRes.json() as any;
      let cast = creditsData.cast || [];

      // Sort by popularity / vote_count and limit to top 30
      cast.sort((a: any, b: any) => {
        const popA = a.popularity || 0;
        const popB = b.popularity || 0;
        return popB - popA;
      });

      const topCredits = cast.slice(0, 30);
      const matchedMovies: any[] = [];
      const matchedSlugs = new Set<string>();

      // Helper function to search a single credit on KKPhim
      const searchKKPhim = async (credit: any) => {
        const titlesToTry = [
          credit.title,
          credit.name,
          credit.original_title,
          credit.original_name
        ].filter(Boolean);

        for (const title of titlesToTry) {
          try {
            const searchRes = await fetch(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(title)}&limit=3`);
            if (searchRes.ok) {
              const resData = await searchRes.json() as any;
              const items = resData.data?.items || [];
              if (items.length > 0) {
                // Find the best match or take the first one
                const match = items[0];
                return {
                  match,
                  pathImage: resData.data?.pathImage || resData.data?.APP_DOMAIN_CDN_IMAGE || 'https://phimimg.com'
                };
              }
            }
          } catch (e) {
            console.error(`Error searching KKPhim for title ${title}:`, e);
          }
        }
        return null;
      };

      // Process in batches of 5 to avoid overwhelming phimapi.com
      const batchSize = 5;
      for (let i = 0; i < topCredits.length; i += batchSize) {
        const batch = topCredits.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(searchKKPhim));

        for (const res of batchResults) {
          if (res && res.match) {
            const item = res.match;
            if (!matchedSlugs.has(item.slug)) {
              matchedSlugs.add(item.slug);
              // Normalize the item structure
              matchedMovies.push({
                slug: item.slug,
                name: item.name,
                origin_name: item.origin_name,
                type: item.type,
                poster_url: item.poster_url,
                thumb_url: item.thumb_url,
                year: item.year || 2024,
                quality: item.quality || 'FHD',
                pathImage: res.pathImage
              });
            }
          }
        }
      }

      return matchedMovies;
    } catch (error) {
      console.error('Error in searchMoviesByActor:', error);
      return [];
    }
  }
}
