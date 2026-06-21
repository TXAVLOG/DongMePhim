import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { apiResponse } from '../../../lib/api/response';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { username, email } = body;

    if (!username && !email) {
      return apiResponse(null, 'error', 'Missing credentials', 400, request);
    }

    const providerType = import.meta.env.PUBLIC_DATA_PROVIDER || 'local';
    
    if (providerType === 'supabase') {
      let query = supabase.from('users').select('package, expiryDate, status');
      
      if (email) {
        query = query.eq('email', email);
      } else if (username) {
        query = query.eq('username', username);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error) {
        throw error;
      }

      if (data) {
        return apiResponse({
          package: data.package || 'Free',
          expiryDate: data.expiryDate,
          status: data.status
        }, 'success', 'User package fetched successfully', 200, request);
      }
    }

    // Fallback if not found or using local
    return apiResponse({
      package: 'Free',
      expiryDate: null,
      status: 'active'
    }, 'success', 'Using fallback free package', 200, request);

  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Server error', 500, request);
  }
};
