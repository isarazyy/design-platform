-- =============================================
-- 设计需求平台 v2 - 评论表 + 图片存储
-- 在 Supabase Dashboard → SQL Editor 中执行
-- =============================================

-- 1. 评论表
create table if not exists comments (
  id bigint generated always as identity primary key,
  requirement_id text references requirements(id) on delete cascade,
  user_id uuid references auth.users(id),
  user_name text default '',
  content text not null,
  created_at timestamptz default now()
);

alter table comments enable row level security;
create policy "comments_select" on comments for select using (true);
create policy "comments_insert" on comments for insert with check (true);
create policy "comments_delete" on comments for delete using (
  auth.uid() = user_id
  or exists(select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- 2. 图片存储桶（公开访问）
insert into storage.buckets (id, name, public)
values ('design-assets', 'design-assets', true)
on conflict (id) do nothing;

create policy "design_assets_select" on storage.objects for select using (bucket_id = 'design-assets');
create policy "design_assets_insert" on storage.objects for insert with check (bucket_id = 'design-assets');
