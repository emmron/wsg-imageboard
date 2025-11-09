import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️  SUPABASE NOT CONFIGURED ⚠️');
  console.error('');
  console.error('To use this platform, you need to:');
  console.error('1. Create a Supabase project at https://supabase.com');
  console.error('2. Create a .env file with your Supabase credentials');
  console.error('3. See QUICKSTART.md for detailed setup instructions');
  console.error('');
  console.error('Missing variables:');
  if (!supabaseUrl) console.error('  - PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) console.error('  - PUBLIC_SUPABASE_ANON_KEY');

  // Don't throw error, create dummy client for development
  // This allows the app to load but shows helpful errors
}

// Client for browser (uses anon key, respects RLS)
// Use dummy values if not configured to allow app to load
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Database types
export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  is_creator: boolean;
  subscription_price: number;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  content_type: 'video' | 'image' | 'text' | 'audio';
  media_url: string | null;
  thumbnail_url: string | null;
  is_free: boolean;
  view_count: number;
  like_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  subscriber_id: string;
  creator_id: string;
  status: 'active' | 'cancelled' | 'expired';
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Tip {
  id: string;
  sender_id: string;
  recipient_id: string;
  amount: number;
  message: string | null;
  stripe_payment_id: string | null;
  created_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Earning {
  id: string;
  creator_id: string;
  amount: number;
  type: 'subscription' | 'tip' | 'ppv';
  source_id: string | null;
  stripe_transfer_id: string | null;
  status: 'pending' | 'paid' | 'failed';
  created_at: string;
}

// Helper functions
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function isSubscribed(subscriberId: string, creatorId: string) {
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .eq('creator_id', creatorId)
    .eq('status', 'active')
    .single();

  return !!data;
}

export async function getCreatorPosts(creatorId: string, includePrivate = false) {
  let query = supabase
    .from('posts')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (!includePrivate) {
    query = query.eq('is_free', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Post[];
}

export async function getFeedPosts(userId: string) {
  // Get posts from subscribed creators
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      creator:profiles!posts_creator_id_fkey(*)
    `)
    .in('creator_id',
      supabase
        .from('subscriptions')
        .select('creator_id')
        .eq('subscriber_id', userId)
        .eq('status', 'active')
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}
