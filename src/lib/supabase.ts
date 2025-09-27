import { createClient } from '@supabase/supabase-js'

// Vite automatically loads environment variables prefixed with VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface UserProfile {
  id: string
  email: string
  username: string
  display_name: string
  role: 'user' | 'admin'
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Article {
  id: string
  title: string
  content: string
  author_id: string
  published_at: string
  updated_at: string
  is_published: boolean
  user_profiles?: UserProfile
}

export interface Subscription {
  id: string
  user_id: string
  is_active: boolean
  subscribed_at: string
  unsubscribed_at?: string
}

export interface Notification {
  id: string
  user_id: string
  article_id: string
  message: string
  is_read: boolean
  created_at: string
  articles?: Article
}