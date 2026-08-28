---
name: react-19-typescript
description: Master React 19 and modern TypeScript patterns, including useActionState, useOptimistic, use() hook, direct ref props, async transitions, Motion (v12) animations, and type-safe architectures.
metadata:
  author: mark-anthony
  version: "1.0"
compatibility: React 19.x, TypeScript 5.5+
---

# React 19 + TypeScript Architectural Patterns

This skill covers first-class conventions, hooks, typing patterns, and common pitfalls when developing in **React 19** with **TypeScript** and **Motion** (`motion/react` v12).

---

## 1. New React 19 Hooks & Async State

### 1.1 `useActionState` for Async Actions & Forms
Replaces boilerplate `useState` + `setIsLoading` + `setError` patterns for forms and async mutations:

```tsx
import { useActionState } from 'react';

type FormState = {
  error?: string;
  success?: boolean;
};

async function submitProfile(prevState: FormState, formData: FormData): Promise<FormState> {
  const username = formData.get('username') as string;
  if (!username) return { error: 'Username is required' };

  try {
    await updateProfileInDb(username);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update profile' };
  }
}

export function ProfileForm() {
  const [state, formAction, isPending] = useActionState(submitProfile, {});

  return (
    <form action={formAction} className="space-y-4">
      <input name="username" placeholder="Username" className="input" />
      {state.error && <p className="text-red-500">{state.error}</p>}
      {state.success && <p className="text-green-600">Saved successfully!</p>}
      <button type="submit" disabled={isPending} className="btn">
        {isPending ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
}
```

### 1.2 `useOptimistic` for Instant UI Updates
Update UI optimistically while a server or async request is in-flight:

```tsx
import { useOptimistic } from 'react';

type Showcase = { id: string; title: string; stars: number };

export function StarButton({ showcase, onStar }: { showcase: Showcase; onStar: (id: string) => Promise<void> }) {
  const [optimisticShowcase, setOptimisticShowcase] = useOptimistic(
    showcase,
    (state, newStars: number) => ({ ...state, stars: newStars })
  );

  const handleStar = async () => {
    setOptimisticShowcase(optimisticShowcase.stars + 1);
    await onStar(showcase.id);
  };

  return (
    <button onClick={handleStar} className="btn-sm flex items-center gap-1">
      ★ {optimisticShowcase.stars}
    </button>
  );
}
```

### 1.3 `use` for Resource Unwrapping
In React 19, the `use()` hook can unwrap promises and context inside conditions and loops:

```tsx
import { use, Suspense } from 'react';

function UserBadge({ userPromise }: { userPromise: Promise<UserProfile> }) {
  const user = use(userPromise);
  return <span>{user.display_name}</span>;
}

export function ProfileCard({ userPromise }: { userPromise: Promise<UserProfile> }) {
  return (
    <Suspense fallback={<div>Loading profile...</div>}>
      <UserBadge userPromise={userPromise} />
    </Suspense>
  );
}
```

---

## 2. React 19 Paradigm Shifts

### 2.1 Direct `ref` as a Prop (`forwardRef` is Deprecated)
In React 19, function components accept `ref` directly as a prop. You no longer need `forwardRef`:

```tsx
// React 19 (Modern)
interface CustomInputProps extends React.ComponentProps<'input'> {
  label: string;
  ref?: React.Ref<HTMLInputElement>;
}

export function CustomInput({ label, ref, ...props }: CustomInputProps) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input ref={ref} {...props} />
    </div>
  );
}
```

### 2.2 Document Metadata Directives
Render `<title>`, `<meta>`, and `<link>` directly in components. React automatically hoists them to `<head>`:

```tsx
export function ShowcasePage({ title }: { title: string }) {
  return (
    <div>
      <title>{title} | GitShowcase</title>
      <meta name="description" content={`Explore ${title}`} />
      <h1>{title}</h1>
    </div>
  );
}
```

---

## 3. Motion (`motion/react` v12) Integration

In modern Motion v12, import from `"motion/react"` (or `"motion"`):

```tsx
import { motion, AnimatePresence } from 'motion/react';

export function CardList({ items }: { items: Array<{ id: string; title: string }> }) {
  return (
    <div className="grid gap-4">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="p-4 border rounded-md"
          >
            {item.title}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

---

## 4. Strict TypeScript Patterns

### 4.1 Discriminated Unions for Async States
```typescript
export type AsyncState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: Error };
```

### 4.2 Type-Safe Custom Context Hook Pattern
```typescript
import { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  user: User | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```
