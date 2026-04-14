import { supabase, isSupabaseConfigured } from './supabase';

export interface Comment {
  id: number;
  requirement_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export async function getComments(requirementId: string): Promise<Comment[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('requirement_id', requirementId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data as Comment[];
}

export async function addComment(requirementId: string, userId: string, userName: string, content: string): Promise<Comment | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase
    .from('comments')
    .insert({ requirement_id: requirementId, user_id: userId, user_name: userName, content })
    .select()
    .single();

  if (error) return null;
  return data as Comment;
}

export async function deleteComment(commentId: number): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('comments').delete().eq('id', commentId);
}
