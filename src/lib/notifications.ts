import { supabase, isSupabaseConfigured } from './supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: 'assigned' | 'status_change' | 'deadline_soon';
  title: string;
  message: string;
  requirement_id: string;
  read: boolean;
  created_at: string;
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return [];
  return data as Notification[];
}

export async function markAsRead(notificationId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
}

export async function markAllAsRead(userId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

export async function createNotification(userId: string, type: Notification['type'], title: string, notificationMessage: string, requirementId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message: notificationMessage,
    requirement_id: requirementId,
    read: false,
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured() || !supabase) return 0;
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) return 0;
  return count || 0;
}
