import { supabase, isSupabaseConfigured } from './supabase';
import type { RequirementFormData } from '../types';

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

const FIELD_LABELS: Record<string, string> = {
  title: '标题',
  requester: '提需人',
  department: '部门',
  type: '需求类型',
  background: '需求背景',
  objective: '需求目标',
  start_date: '开始日期',
  end_date: '截止日期',
  priority: '优先级',
  design_notes: '设计要求',
  extra_notes: '补充说明',
};

export function diffFields(oldData: RequirementFormData, newData: RequirementFormData): string {
  const changes: string[] = [];
  for (const key of Object.keys(FIELD_LABELS)) {
    const k = key as keyof RequirementFormData;
    const oldVal = oldData[k];
    const newVal = newData[k];
    if (typeof oldVal === 'string' && typeof newVal === 'string' && oldVal !== newVal) {
      const label = FIELD_LABELS[key];
      if (oldVal && newVal) {
        changes.push(`${label}：「${oldVal.length > 20 ? oldVal.slice(0, 20) + '...' : oldVal}」→「${newVal.length > 20 ? newVal.slice(0, 20) + '...' : newVal}」`);
      } else if (newVal) {
        changes.push(`添加了${label}`);
      } else {
        changes.push(`清空了${label}`);
      }
    }
  }
  const oldMatCount = (oldData.materials || []).length;
  const newMatCount = (newData.materials || []).length;
  if (oldMatCount !== newMatCount) {
    changes.push(`物料数量：${oldMatCount} → ${newMatCount}`);
  }
  const oldVerCount = (oldData.versions || []).length;
  const newVerCount = (newData.versions || []).length;
  if (oldVerCount !== newVerCount) {
    changes.push(`版本节点：${oldVerCount} → ${newVerCount}`);
  }
  return changes.length > 0 ? changes.join('；') : '修改了需求内容';
}
