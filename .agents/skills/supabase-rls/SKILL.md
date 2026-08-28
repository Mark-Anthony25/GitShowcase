---
name: supabase-rls
description: Author airtight Supabase Row Level Security (RLS) policies, Postgres schemas, auth triggers for GitHub OAuth, RLS performance indexing, and resilient offline/unconfigured fallback architectures.
metadata:
  author: mark-anthony
  version: "1.0"
compatibility: Supabase JS v2+, PostgreSQL 15+
---

# Supabase Row Level Security (RLS) & Architecture Guide

This skill provides production-grade standards for designing schemas, writing secure RLS policies, syncing OAuth profiles via Postgres triggers, and implementing resilient offline/fallback states with `@supabase/supabase-js`.

---

## 1. Core Principles of Supabase RLS

1. **Always Enable and Force RLS**:
   ```sql
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.showcases ENABLE ROW LEVEL SECURITY;

   -- Force RLS even for table owners/service roles when testing in SQL editor
   ALTER TABLE public.showcases FORCE ROW LEVEL SECURITY;
   ```
2. **Default Deny**: Once RLS is enabled, any request without a matching permissive policy is rejected.
3. **Explicit Action Separation**: Avoid generic `FOR ALL` policies. Define discrete policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.

---

## 2. Production RLS Policy Templates

### 2.1 User Profiles Table (`public.profiles`)

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  github_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for foreign keys and queries
CREATE INDEX idx_profiles_username ON public.profiles(username);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Anyone (public or auth) can view profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- 2. Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

-- 3. Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
```

### 2.2 User-Owned Items (`public.showcases`)

```sql
CREATE TABLE public.showcases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  repo_name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  stars_count INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- CRITICAL: Always index user_id and filters used in RLS policies
CREATE INDEX idx_showcases_user_id ON public.showcases(user_id);
CREATE INDEX idx_showcases_is_public ON public.showcases(is_public);

ALTER TABLE public.showcases ENABLE ROW LEVEL SECURITY;

-- 1. Public showcases are viewable by anyone, private showcases only by owner
CREATE POLICY "Showcases viewable if public or owner"
  ON public.showcases FOR SELECT
  USING (
    is_public = true
    OR (SELECT auth.uid()) = user_id
  );

-- 2. Authenticated users can create showcases for themselves
CREATE POLICY "Users can insert own showcases"
  ON public.showcases FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id
  );

-- 3. Users can update only their own showcases
CREATE POLICY "Users can update own showcases"
  ON public.showcases FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4. Users can delete only their own showcases
CREATE POLICY "Users can delete own showcases"
  ON public.showcases FOR DELETE
  USING ((SELECT auth.uid()) = user_id);
```

---

## 3. RLS Performance & Optimization

> [!IMPORTANT]
> Always wrap `auth.uid()` as `(SELECT auth.uid())` in policy definitions. This ensures Postgres evaluates the user ID once per statement rather than re-evaluating for every candidate row in table scans.

```sql
-- Fast (Single evaluation)
USING (user_id = (SELECT auth.uid()))

-- Slow (Re-evaluated per row scan)
USING (user_id = auth.uid())
```

---

## 4. GitHub OAuth Profile Auto-Sync Trigger

When users sign in via GitHub OAuth, automatically provision their `public.profiles` row using a Postgres `SECURITY DEFINER` function:

```sql
-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    github_url,
    bio
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'user_name',
      NEW.raw_user_meta_data->>'preferred_username',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'GitHub User'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE('https://github.com/' || (NEW.raw_user_meta_data->>'user_name'), ''),
    COALESCE(NEW.raw_user_meta_data->>'bio', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    avatar_url = EXCLUDED.avatar_url,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Trigger firing on auth.users creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 5. Offline Fallback & Graceful Degradation Pattern

For apps offering a **localStorage fallback** when Supabase credentials are missing or offline:

1. **Client Guard**:
   ```typescript
   export const isSupabaseConfigured = Boolean(
     import.meta.env.VITE_SUPABASE_URL &&
     import.meta.env.VITE_SUPABASE_ANON_KEY &&
     !import.meta.env.VITE_SUPABASE_URL.includes('your-project')
   );
   ```

2. **Repository Pattern (Cloud vs Local)**:
   ```typescript
   export async function getShowcases(): Promise<Showcase[]> {
     if (!isSupabaseConfigured) {
       const cached = localStorage.getItem('local_showcases');
       return cached ? JSON.parse(cached) : DEFAULT_MOCK_SHOWCASES;
     }

     try {
       const { data, error } = await supabase
         .from('showcases')
         .select('*')
         .order('created_at', { ascending: false });

       if (error) throw error;
       return data;
     } catch (err) {
       console.warn('Supabase fetch failed, falling back to local cache:', err);
       const cached = localStorage.getItem('local_showcases');
       return cached ? JSON.parse(cached) : DEFAULT_MOCK_SHOWCASES;
     }
   }
   ```
