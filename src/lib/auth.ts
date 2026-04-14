import { supabase, isSupabaseConfigured } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  name: string;
  department: string;
  role: 'user' | 'designer' | 'admin';
  created_at: string;
}

const ALLOWED_DOMAIN = 'kanyun.com';

export function isAllowedEmail(email: string): boolean {
  return email.endsWith(`@${ALLOWED_DOMAIN}`);
}

export async function signUp(email: string, password: string, name: string, department: string) {
  if (!isSupabaseConfigured() || !supabase) throw new Error('系统未配置');
  if (!isAllowedEmail(email)) throw new Error(`仅支持 @${ALLOWED_DOMAIN} 公司邮箱注册`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, department },
    },
  });

  if (error) throw new Error(error.message);

  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email,
      name,
      department,
      role: 'user',
    });
  }

  return data;
}

export async function signIn(email: string, password: string) {
  if (!isSupabaseConfigured() || !supabase) throw new Error('系统未配置');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? '邮箱或密码错误' : error.message);
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data as Profile;
}

export async function updateProfile(userId: string, updates: Partial<Pick<Profile, 'name' | 'department'>>) {
  if (!supabase) return;
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw new Error(error.message);
}

export async function getAllProfiles(): Promise<Profile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return [];
  return data as Profile[];
}

export async function updateUserRole(userId: string, role: Profile['role']) {
  if (!supabase) return;
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}
