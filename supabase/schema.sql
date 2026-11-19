create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Member',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists messages_workspace_created_idx on public.messages(workspace_id, created_at);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members where workspace_id = target_workspace and user_id = auth.uid());
$$;

create policy "Profiles are visible to signed-in workspace members" on public.profiles for select to authenticated using (true);
create policy "Users manage their own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Members can view workspaces" on public.workspaces for select to authenticated using (public.is_workspace_member(id) or owner_id = auth.uid());
create policy "Users can create workspaces" on public.workspaces for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners can update workspaces" on public.workspaces for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Members can view membership" on public.workspace_members for select to authenticated using (public.is_workspace_member(workspace_id) or user_id = auth.uid());
create policy "Users can join owned workspaces" on public.workspace_members for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.workspaces where id = workspace_id and owner_id = auth.uid()));
create policy "Members can read messages" on public.messages for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "Members can send messages" on public.messages for insert to authenticated with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Member'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter publication supabase_realtime add table public.messages;
