import { supabase } from './supabase';
import type { AstroCookies } from 'astro';

export const SESSION_COOKIE_NAME = 'txa_session';
const SESSION_EXPIRY_DAYS = 30; // 30 days

export async function createSession(userId: string, request: Request, cookies: AstroCookies) {
  // Get User Agent
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Create expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  // Insert session
  const { data: session, error } = await supabase
    .from('txa_user_sessions')
    .insert({
      user_id: userId,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString()
    })
    .select('session_token')
    .single();

  if (error || !session) {
    console.error('Failed to create session:', error);
    return false;
  }

  // Set cookie
  cookies.set(SESSION_COOKIE_NAME, session.session_token, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    expires: expiresAt
  });

  return true;
}

export async function verifySession(request: Request, cookies: AstroCookies) {
  const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  
  if (!sessionToken) {
    return null;
  }

  const userAgent = request.headers.get('user-agent') || 'unknown';

  const { data: session, error } = await supabase
    .from('txa_user_sessions')
    .select('user_agent, expires_at, users(*)')
    .eq('session_token', sessionToken)
    .maybeSingle();

  if (error || !session) {
    // Session not found in DB
    cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(session.expires_at);

  if (now > expiresAt) {
    // Session expired
    await supabase.from('txa_user_sessions').delete().eq('session_token', sessionToken);
    cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
    return null;
  }

  if (session.user_agent !== userAgent) {
    // Device binding failed (cookie was copied)
    console.warn(`Session binding failed for token ${sessionToken}. Expected UA: ${session.user_agent}, Got: ${userAgent}`);
    // We could delete it, but maybe it's stolen, so definitely delete it to secure the account
    await supabase.from('txa_user_sessions').delete().eq('session_token', sessionToken);
    cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
    return null;
  }

  // Return the user object
  return session.users;
}

export async function destroySession(cookies: AstroCookies) {
  const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    await supabase.from('txa_user_sessions').delete().eq('session_token', sessionToken);
    cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
  }
}
