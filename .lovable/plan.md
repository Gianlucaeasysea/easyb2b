

# Doc 11 — Post-Launch Improvements (6 of 7)

Improvement 7 (Sales RLS restriction) skipped per your choice to maintain full visibility.

## Improvement 1 — React Error Boundaries (Critical)

Create `src/components/ErrorBoundary.tsx` — a class component with `getDerivedStateFromError` + `componentDidCatch`, showing a "Something went wrong" fallback with a "Try again" button. Accepts `section` and optional `fallback` props.

Wrap `<Outlet />` in each layout:
- `AdminLayout.tsx` → `<ErrorBoundary section="admin panel">`
- `CRMLayout.tsx` → `<ErrorBoundary section="CRM">`
- `PortalLayout.tsx` → `<ErrorBoundary section="dealer portal">`
- `App.tsx` → wrap `<BrowserRouter>` content with `<ErrorBoundary section="application">`

## Improvement 2 — React Query Global staleTime

In `App.tsx`, update the `QueryClient` instantiation:
```
staleTime: 30_000, gcTime: 300_000, retry: 1, refetchOnWindowFocus: false
```
This makes page navigation instant from cache. Notification queries already use `refetchInterval` so they stay fresh.

## Improvement 3 — Edge Function Input Validation

Add input validation to 4 edge functions:

- **`create-dealer-account/index.ts`**: Validate email format, password length ≥ 8, client_id is string, action is `create` or `delete`.
- **`send-dealer-request-notification/index.ts`**: Validate companyName, contactName, email format are present and valid.
- **`send-order-notification/index.ts`**: Already validates `orderId` + `type`. Add UUID format check on `orderId`.
- **`generate-email-draft/index.ts`**: Validate `template_type` is one of the expected values, `context` object exists.

## Improvement 4 — Scope Realtime Channels

4 realtime subscriptions found. Changes:

| File | Current Channel | Change |
|------|----------------|--------|
| `PortalLayout.tsx` | `dealer-notifications-${client.id}` + filter | Already scoped — no change needed |
| `useNewOrderNotifications.ts` | `admin-new-orders` (generic) | Scope to `admin-new-orders-${user.id}` to avoid cross-tab collisions |
| `CRMOrders.tsx` | `crm-orders-realtime` (generic) | Scope to `crm-orders-${user.id}` |
| `CRMDealsPipeline.tsx` | `deals-pipeline-realtime` (generic) | Scope to `deals-pipeline-${user.id}` |

For CRM/Admin channels, these are admin-facing so a server-side filter isn't needed (RLS protects the data queries), but scoping the channel name prevents cross-tab/cross-user collisions.

## Improvement 5 — Rate Limiting on Become a Dealer Form

**Client-side** (`BecomeADealer.tsx`): Add 30-second cooldown using `lastSubmitTime` state. Disable button during cooldown.

**Server-side** (DB migration): Create trigger `check_distributor_request_rate` that rejects inserts from the same email within 24h if there are already ≥ 3 submissions.

## Improvement 6 — CSP Headers

Add a `<meta>` CSP tag to `index.html` since Lovable doesn't use vercel.json for headers:
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://gmail.googleapis.com https://oauth2.googleapis.com https://ai.gateway.lovable.dev;
frame-ancestors 'none';
```

Also add `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` via `<meta>` tags where possible (note: some headers like X-Frame-Options can only be set server-side, so we'll add what's possible via meta tags).

---

## Summary

| # | Improvement | Files Modified |
|---|-------------|---------------|
| 1 | Error Boundaries | 1 new + 4 edits |
| 2 | React Query staleTime | `App.tsx` |
| 3 | Edge Function Validation | 4 edge functions |
| 4 | Scope Realtime Channels | 3 files |
| 5 | Rate Limiting | `BecomeADealer.tsx` + 1 migration |
| 6 | CSP Headers | `index.html` |
| 7 | Sales RLS | **Skipped** (per your choice) |

**Total**: ~12 files, 1 DB migration.

