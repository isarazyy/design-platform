import type { Requirement, RequirementFormData, RequirementStatus } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_KEY = 'design_requirements';
const DRAFT_KEY = 'design_draft';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function getLocalRequirements(): Requirement[] {
  const data = localStorage.getItem(LOCAL_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalRequirements(reqs: Requirement[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(reqs));
}

export async function createRequirement(formData: RequirementFormData, creatorId?: string): Promise<Requirement> {
  const now = new Date().toISOString();
  const req: Requirement = {
    ...formData,
    id: generateId(),
    status: '待审核',
    creator_id: creatorId || null,
    collaborator_ids: [],
    assignee_id: null,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('requirements')
      .insert({
        id: req.id,
        title: req.title,
        requester: req.requester,
        department: req.department,
        type: req.type,
        background: req.background,
        objective: req.objective,
        start_date: req.start_date,
        end_date: req.end_date,
        priority: req.priority,
        materials: req.materials,
        copywriting_mode: req.copywriting_mode,
        main_title: req.main_title,
        sub_title: req.sub_title,
        body_text: req.body_text,
        free_text: req.free_text,
        style_tags: req.style_tags,
        design_notes: req.design_notes,
        reference_links: req.reference_links,
        reference_images: req.reference_images,
        extra_notes: req.extra_notes,
        status: req.status,
        creator_id: creatorId || null,
        collaborator_ids: [],
        assignee_id: null,
        created_at: req.created_at,
        updated_at: req.updated_at,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Requirement;
  }

  const reqs = getLocalRequirements();
  reqs.unshift(req);
  saveLocalRequirements(reqs);
  return req;
}

export async function getRequirements(): Promise<Requirement[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as Requirement[];
  }

  return getLocalRequirements();
}

export async function getRequirementById(id: string): Promise<Requirement | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Requirement;
  }

  const reqs = getLocalRequirements();
  return reqs.find(r => r.id === id) || null;
}

export async function updateRequirementStatus(id: string, status: RequirementStatus): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('requirements')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
    return;
  }

  const reqs = getLocalRequirements();
  const idx = reqs.findIndex(r => r.id === id);
  if (idx !== -1) {
    reqs[idx].status = status;
    reqs[idx].updated_at = new Date().toISOString();
    saveLocalRequirements(reqs);
  }
}

export async function deleteRequirement(id: string): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error, count } = await supabase
      .from('requirements')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) throw new Error(error.message);
    if (count === 0) throw new Error('删除失败，可能没有权限');
    return;
  }

  const reqs = getLocalRequirements();
  saveLocalRequirements(reqs.filter(r => r.id !== id));
}

export async function updateRequirement(id: string, formData: RequirementFormData): Promise<Requirement> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('requirements')
      .update({
        title: formData.title,
        requester: formData.requester,
        department: formData.department,
        type: formData.type,
        background: formData.background,
        objective: formData.objective,
        start_date: formData.start_date,
        end_date: formData.end_date,
        priority: formData.priority,
        materials: formData.materials,
        copywriting_mode: formData.copywriting_mode,
        main_title: formData.main_title,
        sub_title: formData.sub_title,
        body_text: formData.body_text,
        free_text: formData.free_text,
        style_tags: formData.style_tags,
        design_notes: formData.design_notes,
        reference_links: formData.reference_links,
        reference_images: formData.reference_images,
        extra_notes: formData.extra_notes,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Requirement;
  }

  const reqs = getLocalRequirements();
  const idx = reqs.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('需求不存在');
  reqs[idx] = { ...reqs[idx], ...formData, updated_at: now };
  saveLocalRequirements(reqs);
  return reqs[idx];
}

export async function updateCollaborators(id: string, collaboratorIds: string[]): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('requirements')
      .update({ collaborator_ids: collaboratorIds, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
}

export async function updateAssignee(id: string, assigneeId: string | null): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('requirements')
      .update({ assignee_id: assigneeId, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
}

export function saveDraft(data: Partial<RequirementFormData>) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
}

export function loadDraft(): Partial<RequirementFormData> | null {
  const data = localStorage.getItem(DRAFT_KEY);
  return data ? JSON.parse(data) : null;
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export async function uploadImage(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('图片不能超过 5MB');
  }

  if (isSupabaseConfigured() && supabase) {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `ref-images/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('design-assets').upload(path, file, { cacheControl: '31536000' });
    if (!error) {
      const { data } = supabase.storage.from('design-assets').getPublicUrl(path);
      return data.publicUrl;
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}
