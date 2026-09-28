# Account Deletion Design

## Purpose

Let a signed-in GitShowcase student permanently remove their GitShowcase account when they no longer want a presence in the application. The action must never alter the user's GitHub account or GitHub repositories.

## User Experience

The signed-in account menus on desktop and mobile include a clearly separated `Delete Account` action. Selecting it opens a PaperCSS-styled warning dialog that:

- identifies the signed-in GitHub handle;
- explains that the public profile, showcased projects, and local cached data will be removed permanently;
- explicitly states that GitHub data is unaffected;
- requires the user to type `DELETE` before the destructive action is enabled;
- allows cancellation by the cancel control, close control, backdrop, or Escape;
- keeps the dialog open and shows a clear retryable error when removal fails.

On success, the application clears its account-related local caches, ends the session, closes any menus or dialogs, and returns the user to the home page.

## Architecture and Data Flow

The browser calls a Supabase Edge Function named `delete-account` using the current access token. The function verifies the caller from the bearer token, then invokes `auth.admin.deleteUser(caller.id)` with the server-only Supabase service-role client. It returns no user data.

`public.profiles.id` already references `auth.users.id` with `on delete cascade`; removal of the Auth user therefore removes the profile. `showcased_projects.profile_id` also cascades from the profile, so published showcase projects are removed in the same operation. The shared repository-stat cache is deliberately retained because it is not user-owned.

The service-role key is only an Edge Function secret. It is never added to the Vite client, runtime configuration UI, or source-controlled environment files.

For the application's no-Supabase local fallback, deletion only removes the local profile and its local projects, then signs out. The UI clearly presents this as account removal from the current app data store; no remote Auth user exists in this mode.

## Client Boundaries

`AuthContext` owns `deleteAccount()`: it invokes the protected function when Supabase is configured, purges app-owned local data, clears in-memory auth state, and signs out. `Header` owns only the PaperCSS confirmation UI and redirects after a successful deletion. This keeps destructive data operations out of presentation code.

The store exposes a narrowly scoped local-data purge that removes only the active profile, its projects, and affected cache keys; it does not clear unrelated browser settings such as a user-supplied Supabase connection configuration.

## Failure Handling

- The confirmation button is disabled until the exact confirmation word is entered and while deletion is in progress.
- Missing configuration or an unauthorized/failed function response preserves the session and presents a readable error.
- A failed local purge prevents the success redirect and surfaces the error.
- Repeating the action after a successful deletion is harmless because the session has already been cleared.

## Testing and Verification

Tests will assert that the account menus expose the destructive entry and that the dialog requires `DELETE`, uses the PaperCSS dialog treatment, and provides cancel/close affordances. Client tests will assert that deletion delegates to the Edge Function, removes the correct local data, and clears session state only on success. Edge Function tests or source-level authorization assertions will confirm that the caller is resolved from the bearer token and the service role is confined to server code.

The implementation will run the focused new tests first, then the existing TypeScript check, full suite, production build, and whitespace check.
