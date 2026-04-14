export type RequirementType = '视觉设计' | '美术' | '动画';
export type Priority = '紧急' | '高' | '中' | '低';
export type RequirementStatus = '待制作' | '制作中' | '待审核' | '已交付' | '已关闭';

export interface Material {
  id: string;
  type: string | string[];
  quantity: number;
  size: string;
  notes: string;
  copy_mode?: 'template' | 'free';
  main_title?: string;
  sub_title?: string;
  body_text?: string;
  free_text?: string;
}

export interface VersionNode {
  id: string;
  name: string;
  date: string | null;
  note: string;
}

export interface ReferenceLink {
  id: string;
  url: string;
  description: string;
}

export interface Requirement {
  id: string;
  title: string;
  requester: string;
  department: string;
  type: RequirementType;
  background: string;
  objective: string;
  start_date: string | null;
  end_date: string | null;
  priority: Priority | null;
  versions: VersionNode[];
  materials: Material[];
  copywriting_mode: 'template' | 'free';
  main_title: string;
  sub_title: string;
  body_text: string;
  free_text: string;
  style_tags: string[];
  design_notes: string;
  reference_links: ReferenceLink[];
  reference_images: string[];
  extra_notes: string;
  status: RequirementStatus;
  creator_id: string | null;
  collaborator_ids: string[];
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
}

export type RequirementFormData = Omit<Requirement, 'id' | 'created_at' | 'updated_at' | 'status' | 'creator_id' | 'collaborator_ids' | 'assignee_id'>;
