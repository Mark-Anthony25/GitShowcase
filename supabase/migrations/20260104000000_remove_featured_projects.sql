-- Migration: Remove featured projects indexing and optimize display order
-- Date: 2026-01-04

-- 1. Drop old featured sorting index
drop index if exists public.idx_showcased_projects_featured_order;

-- 2. Create updated display order and creation date index for public showcase
create index if not exists idx_showcased_projects_display_order
  on public.showcased_projects(display_order asc, added_at desc);

