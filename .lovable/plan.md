

## Plan: Client-Side Notifications & Document Improvements

### What we're building

1. **Notifications page for dealers** (`/portal/notifications`) — a dedicated section where dealers see all notifications (new documents uploaded, order status changes, etc.)
2. **Database table `client_notifications`** to store notifications per client
3. **Auto-generate notification when a document is uploaded** (in the existing `OrderDocuments` upload flow)
4. **Notification bell with unread count** in the portal header
5. **Clean documents section** already exists in `DealerOrders.tsx` — minor polish

### Technical Details

**Step 1 — Create `client_notifications` table (migration)**

```sql
CREATE TABLE public.client_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers view own notifications"
  ON public.client_notifications FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Dealers update own notifications"
  ON public.client_notifications FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage notifications"
  ON public.client_notifications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
```

**Step 2 — Auto-create notification on document upload**

In `OrderDocuments.tsx`, after successful upload + event logging, insert a row into `client_notifications` with the order's `client_id`, title like "Nuovo documento disponibile: Fattura", and link to the order.

Also update `send-order-notification` edge function to insert a notification row when `type = 'documents_uploaded'`.

**Step 3 — Create `DealerNotifications.tsx` page**

- Query `client_notifications` ordered by `created_at desc`
- Group by date, show type icon, title, body, timestamp
- "Mark all as read" button
- Click on notification navigates to relevant order

**Step 4 — Add notification bell to portal header**

In `PortalLayout.tsx` header, add a Bell icon with unread count badge. Uses realtime subscription on `client_notifications` for live updates.

**Step 5 — Add route and sidebar entry**

- Register `/portal/notifications` route in `App.tsx`
- Add "Notifications" item with Bell icon to `DealerSidebar.tsx`

### Files to create/edit

| File | Action |
|------|--------|
| Migration SQL | Create `client_notifications` table |
| `src/pages/portal/DealerNotifications.tsx` | Create — notifications page |
| `src/components/OrderDocuments.tsx` | Edit — insert notification on upload |
| `src/layouts/PortalLayout.tsx` | Edit — add bell icon with unread count |
| `src/components/portal/DealerSidebar.tsx` | Edit — add Notifications link |
| `src/App.tsx` | Edit — add route |

