-- 1. Create Profiles Table
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  username text,
  avatar_url text,
  telegram_handle text,
  updated_at timestamp with time zone,

  primary key (id),
  unique (username)
);

-- 2. Add RLS for profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update their own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- 3. Create a function to automatically create a profile for new users
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$;

-- 4. Create a trigger to call the function
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 5. Add is_public column to tracks table
alter table public.tracks
  add column is_public boolean default false not null;

-- 6. Add RLS for public tracks
-- Allow public read access to tracks that are marked as public
create policy "Public tracks are viewable by everyone."
  on public.tracks for select
  using ( is_public = true );

-- Users can view their own private tracks
create policy "Users can view their own private tracks."
  on public.tracks for select
  using ( auth.uid() = user_id );

-- Users can update their own tracks (to make them public/private)
create policy "Users can update their own tracks."
  on public.tracks for update
  using ( auth.uid() = user_id );