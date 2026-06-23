import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json() as { action?: 'add' | 'remove', slug?: string };
    const { action, slug } = data; // action: 'add' | 'remove'

    if (!slug || !action) {
      return apiResponse(null, 'error', 'Missing required fields', 400);
    }

    // TODO: Verify user auth cookie/token here

    // TODO: Add or Remove from User's Playlist in Database
    
    return apiResponse({ slug, action }, 'success', `Successfully ${action}ed`);
  } catch (error) {
    return apiResponse(null, 'error', 'Invalid request', 400);
  }
};

export const GET: APIRoute = async ({ request }) => {
  // TODO: Verify user auth cookie/token
  
  // TODO: Fetch User's Playlist from Database
  const mockPlaylist = [
    { slug: 'phim-a', title: 'Phim A', posterUrl: 'https://placehold.co/400x600' }
  ];

  return apiResponse({ list: mockPlaylist });
};
