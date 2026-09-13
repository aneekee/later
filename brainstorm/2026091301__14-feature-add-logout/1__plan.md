---
title: Add Logout — Implementation Plan
created_at: 2026-09-13
created_by: Aliaksandr Kavalenka
---

## Summary

Add a profile control to the bottom of `AppSidebar` showing a generic icon + the
current user's username. Clicking it opens a dropdown with a single "Logout"
item that calls the existing `logout` mutation and redirects to `/login`.

This plan is the output of a requirements-grilling session; all decisions below
were confirmed with the user and should be followed as-is, not re-derived.

## Confirmed decisions

1. **Visual**: a generic/static icon (same for all users, e.g. `CircleUserIcon`
   from `lucide-react`) + the dynamic `username` text. No per-user avatar image
   — `MeSuccessResponse` has no avatar/email field, only `username`. A trailing
   `ChevronsUpDownIcon` signals the control opens a menu (matches the shadcn
   reference sidebar-user-menu pattern the init doc points to).
2. **Components**: `dropdown-menu` is not yet in
   `apps/web/src/shared/components/ui/` — add it via the shadcn CLI. Do **not**
   add `avatar` — there's no image source to justify it.
3. **Interaction**: click opens the dropdown; the dropdown has exactly one item,
   "Logout". No confirmation dialog — clicking "Logout" fires the mutation
   immediately.
4. **On success**: call `navigate('/login')` explicitly after
   `logout().unwrap()` resolves (mirrors the explicit `navigate('/')` in
   `Login.page.tsx` after login). Do not rely on cache-invalidation + route
   guard redirect. No success toast.
5. **On failure**: show an error toast via the existing `useDisplayErrorToast`
   hook (same pattern as `Login.page.tsx`). Do not force local logout / clear
   state — leave the user as-is so they can retry.
6. **Loading state**: while the `logout` mutation is pending, disable the
   trigger `SidebarMenuButton` (the profile row) and swap the trailing
   `ChevronsUpDownIcon` for the existing `Spinner` component. The dropdown item
   itself is not a reliable place for this — Radix's `DropdownMenu` closes on
   item select, so the trigger button is the only element still visible once
   the mutation is in flight.
7. **File placement**: new component at
   `apps/web/src/features/auth/components/UserMenu.tsx` (auth concern — uses
   `useMeQuery` + `useLogoutMutation`), imported into
   `apps/web/src/widgets/AppSidebar.tsx`. This matches the existing pattern
   where `WithAuth.tsx` and `LoginForm.tsx` live under `features/auth/components/`.
8. **Tests**: none. No test convention exists anywhere in `apps/web` yet;
   introducing one is out of scope for this feature.

## Relevant existing code (read before implementing)

- [apps/web/src/widgets/AppSidebar.tsx](../../apps/web/src/widgets/AppSidebar.tsx) —
  target file, currently `Sidebar` > `SidebarHeader` + `SidebarContent` only, no
  `SidebarFooter`.
- [apps/web/src/features/auth/api/auth.api.ts](../../apps/web/src/features/auth/api/auth.api.ts) —
  `useMeQuery` (returns `MeSuccessResponse { id, username, isVerified, createdAt }`)
  and `useLogoutMutation` (`POST v1/auth/logout`, `invalidatesTags: ['Auth']`,
  currently unused anywhere in the app).
- [apps/web/src/features/auth/components/WithAuth.tsx](../../apps/web/src/features/auth/components/WithAuth.tsx) —
  route guard wrapping `AppLayout`/`AppSidebar`; by the time `AppSidebar` mounts,
  `useMeQuery` data is already resolved (guard redirects to `/login` if it
  isn't), so `UserMenu` does not need its own loading/error branch for `me`.
- [apps/web/src/features/auth/pages/Login.page.tsx](../../apps/web/src/features/auth/pages/Login.page.tsx) —
  convention to mirror: mutation hook + `isLoading` destructured directly in
  the component, `try/catch` with `console.error` + `displayErrorToast` on
  failure, explicit `navigate(...)` on success.
- [apps/web/src/shared/hooks/useDisplayErrorToast.ts](../../apps/web/src/shared/hooks/useDisplayErrorToast.ts) —
  reuse this for the logout error toast.
- [apps/web/src/shared/components/ui/spinner.tsx](../../apps/web/src/shared/components/ui/spinner.tsx) —
  reuse `Spinner` (wraps `Loader2Icon`, already has `animate-spin`) for the
  pending state.
- [apps/web/src/shared/components/ui/sidebar.tsx](../../apps/web/src/shared/components/ui/sidebar.tsx) —
  already exports `SidebarFooter`, `SidebarMenu`, `SidebarMenuItem`,
  `SidebarMenuButton` (with built-in tooltip support for collapsed/icon mode —
  no extra work needed for collapsed-sidebar behavior).
- `apps/web/components.json` — shadcn style `radix-nova`, base color `neutral`,
  `ui` alias → `@/shared/components/ui`. Package manager is `pnpm`
  (`pnpm-lock.yaml` at repo root); `shadcn` CLI is already a dependency of
  `apps/web`.

## Steps

### 1. Add the shadcn `dropdown-menu` component

Run from `apps/web`:

```bash
pnpm dlx shadcn@latest add dropdown-menu
```

This should create `apps/web/src/shared/components/ui/dropdown-menu.tsx`
exporting `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`,
`DropdownMenuItem` (and other primitives, unused here). Verify the file lands
in the right place and matches the existing style of other `ui/` components
(e.g. `dialog.tsx`) before proceeding — if the CLI prompts for anything,
answer consistently with `components.json` (style `radix-nova`, no RSC).

### 2. Create `apps/web/src/features/auth/components/UserMenu.tsx`

```tsx
import { useNavigate } from "react-router";
import { ChevronsUpDownIcon, CircleUserIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/components/ui/sidebar";
import { Spinner } from "@/shared/components/ui/spinner";
import { useDisplayErrorToast } from "@/shared/hooks/useDisplayErrorToast";

import { useLogoutMutation, useMeQuery } from "../api/auth.api";

export const UserMenu = () => {
  const navigate = useNavigate();
  const { data } = useMeQuery();
  const [logout, { isLoading }] = useLogoutMutation();
  const { displayErrorToast } = useDisplayErrorToast();

  const onLogoutClick = async () => {
    try {
      await logout().unwrap();
      await navigate("/login");
    } catch (e) {
      console.error("Logout error:", e);
      displayErrorToast(e, "Logout failed. Please try again.");
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" disabled={isLoading}>
              <CircleUserIcon />
              <span>{data?.username}</span>
              {isLoading ? (
                <Spinner className="ml-auto" />
              ) : (
                <ChevronsUpDownIcon className="ml-auto" />
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="min-w-56">
            <DropdownMenuItem onSelect={() => void onLogoutClick()}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
```

Notes for the implementing agent:

- Double-check the actual exported member names in the generated
  `dropdown-menu.tsx` (shadcn's CLI output can vary slightly by version) and
  adjust imports accordingly.
- `size="lg"` on `SidebarMenuButton` matches the taller row shadcn uses for
  sidebar user-menu triggers (see `sidebarMenuButtonVariants` in
  `sidebar.tsx`); confirm it reads well next to the nav items above, adjust if
  it looks off.
- `onSelect` (not `onClick`) is the correct Radix `DropdownMenuItem` handler —
  `onClick` also works but `onSelect` is idiomatic for Radix menu items and is
  what shadcn's own examples use.
- Do not add a loading/error branch for `useMeQuery` — see "Relevant existing
  code" above for why it's unnecessary here.

### 3. Wire `UserMenu` into `AppSidebar.tsx`

Add a `SidebarFooter` (imported from `@/shared/components/ui/sidebar`,
alongside the other `Sidebar*` imports already there) after `SidebarContent`,
rendering `UserMenu`:

```tsx
<Sidebar>
  <SidebarHeader>...</SidebarHeader>
  <SidebarContent>...</SidebarContent>
  <SidebarFooter>
    <UserMenu />
  </SidebarFooter>
</Sidebar>
```

Import `UserMenu` from `../features/auth/components/UserMenu` (adjust relative
path as needed from `widgets/AppSidebar.tsx`).

### 4. Manual verification (no automated tests per decision #8)

Run the dev server and check in the browser:

- [x] Logged in: sidebar footer shows the generic icon + the logged-in
      username.
- [x] Clicking the profile row opens a dropdown with exactly one item,
      "Logout".
- [x] Clicking "Logout" redirects to `/login` (verified end-to-end against
      the local API + Postgres/Mongo dev containers).
- [x] After redirect, navigating back to `/` or `/inbox` redirects to
      `/login` again (session is actually cleared server-side).
- [x] Simulated a logout failure (patched `window.fetch` in-browser to reject
      the logout call) — error toast "Logout failed. Please try again."
      appeared, the user stayed on the dashboard, and the trigger returned to
      its normal (non-disabled, chevron-visible) state.
- [x] Collapsing the sidebar: `AppSidebar`'s `<Sidebar>` doesn't opt into
      `collapsible="icon"` (it uses the default `"offcanvas"`), so collapsing
      hides the whole sidebar, nav items included — same pre-existing
      behavior, not something this feature changes. No icon-only mode exists
      to verify here.
- [x] Verified on a mobile-width viewport (375×812) — the sidebar renders as
      a sheet, the profile control and dropdown work the same way, and
      logout redirects to `/login` as expected.

## Out of scope

- Avatar images / initials-based avatars.
- Confirmation dialog before logout.
- Success toast on logout.
- Automated tests (unit or e2e) — no convention exists yet in this app.
- Any change to the `logout` mutation itself, or to `WithAuth.tsx`.
