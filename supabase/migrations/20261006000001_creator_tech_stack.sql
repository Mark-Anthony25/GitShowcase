-- Tech stacks are selected by creators; existing profiles start empty.
alter table public.profiles add column if not exists tech_stack text[] not null default '{}'::text[];
