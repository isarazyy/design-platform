-- 在 Supabase SQL Editor 中执行此脚本来创建数据库表

create table if not exists requirements (
  id text primary key,
  title text not null,
  requester text not null,
  department text default '',
  type text not null check (type in ('视觉设计', '美术', '动画')),
  background text default '',
  objective text default '',
  start_date text,
  end_date text,
  priority text check (priority in ('紧急', '高', '中', '低')),
  materials jsonb default '[]',
  copywriting_mode text default 'template' check (copywriting_mode in ('template', 'free')),
  main_title text default '',
  sub_title text default '',
  body_text text default '',
  free_text text default '',
  style_tags jsonb default '[]',
  design_notes text default '',
  reference_links jsonb default '[]',
  reference_images jsonb default '[]',
  extra_notes text default '',
  status text default '待审核' check (status in ('草稿', '待审核', '设计中', '已交付', '已关闭')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 开启行级安全策略（RLS），允许所有人读写（公开使用，无需登录）
alter table requirements enable row level security;

create policy "允许所有人读取" on requirements for select using (true);
create policy "允许所有人创建" on requirements for insert with check (true);
create policy "允许所有人更新" on requirements for update using (true);

-- 创建存储桶（用于参考图片上传）
-- 需要在 Supabase Dashboard > Storage 中手动创建名为 uploads 的公开桶
