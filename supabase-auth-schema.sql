-- =============================================
-- 设计需求平台 - 账号权限系统数据库变更
-- 在 Supabase Dashboard → SQL Editor 中执行
-- =============================================

-- 1. 用户档案表
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  department text default '',
  role text default 'user' check (role in ('user', 'designer', 'admin')),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (
  auth.uid() = id
  or exists(select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- 2. 给 requirements 表加权限相关字段
alter table requirements add column if not exists creator_id uuid references auth.users(id);
alter table requirements add column if not exists collaborator_ids jsonb default '[]';
alter table requirements add column if not exists assignee_id uuid;

-- 3. 修改记录表
create table if not exists edit_logs (
  id bigint generated always as identity primary key,
  requirement_id text references requirements(id) on delete cascade,
  user_id uuid references auth.users(id),
  user_name text default '',
  action text not null,
  changes text default '',
  created_at timestamptz default now()
);

alter table edit_logs enable row level security;
create policy "edit_logs_select" on edit_logs for select using (true);
create policy "edit_logs_insert" on edit_logs for insert with check (true);

-- 4. 注册时自动创建 profile 的触发器
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================
-- 执行完后，注册第一个账号，然后在 profiles 表中
-- 手动把该用户的 role 改为 'admin'
-- =============================================
