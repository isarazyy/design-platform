import { supabase, isSupabaseConfigured } from './supabase';

export interface EditLog {
  id: number;
  requirement_id: string;
  user_id: string;
  user_name: string;
  action: string;
  changes: string;
  created_at: string;
}

export async function addEditLog(requirementId: string, userId: string, userName: string, action: string, changes?: string) {
  if (!isSupabaseConfigured() || !supabase) return;

  await supabase.from('edit_logs').insert({
    requirement_id: requirementId,
    user_id: userId,
    user_name: userName,
    action,
    changes: changes || '',
  });
}

export async function getEditLogs(requirementId: string): Promise<EditLog[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from('edit_logs')
    .select('*')
    .eq('requirement_id', requirementId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data as EditLog[];
}
