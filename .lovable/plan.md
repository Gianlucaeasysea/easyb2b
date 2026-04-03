

# Cookie Banner GDPR + Dealer Form Consent — English Version

All UI text will be in English, consistent with the platform's international B2B context.

---

## 1. Cookie Banner (`src/components/CookieBanner.tsx`)

Collapsed state with three buttons:
- **"Accept All"** / **"Necessary Only"** / **"Customize"**
- Text: *"We use cookies to improve your experience. Read our [Cookie Policy](/cookie-policy)."*

Expanded (Customize) panel — toggle switches:
- **Necessary** (always on, disabled) — *"Required for the website to function"*
- **Analytics** — *"Help us understand how you use the site"*
- **Marketing** — *"Used for targeted communications"*
- Button: **"Save Preferences"**

Consent saved in `localStorage` as `cookie-consent`. Animated with framer-motion.

## 2. Become a Dealer Form (`src/pages/BecomeADealer.tsx`)

Replace the single privacy checkbox with two:
1. **Required**: *"I have read and agree to the [Privacy Policy](/privacy-policy) and [Terms of Service](/terms-of-service)"*
2. **Optional**: *"I consent to receive marketing and promotional communications"*

Save `marketing_consent` (boolean) to `distributor_requests`.

## 3. Database

```sql
ALTER TABLE distributor_requests ADD COLUMN marketing_consent boolean NOT NULL DEFAULT false;
```

## 4. Integration

- Add `<CookieBanner />` in `src/App.tsx` (root level)
- Update email notification payload to include `marketing_consent`

## Files

| Action | File |
|--------|------|
| Create | `src/components/CookieBanner.tsx` |
| Edit | `src/App.tsx` — add CookieBanner |
| Edit | `src/pages/BecomeADealer.tsx` — dual consent checkboxes + marketing_consent field |
| Migration | Add `marketing_consent` column |

