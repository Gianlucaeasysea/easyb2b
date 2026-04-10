# Edge Functions — Documentazione

## Overview

Le Edge Functions del progetto girano su Deno (Supabase Edge Runtime). Si trovano in `supabase/functions/` con moduli condivisi in `supabase/functions/_shared/`.

## Autenticazione delle funzioni

Le Edge Functions accettano autenticazione in due modi:
1. **JWT Bearer token**: per chiamate dal frontend autenticato
2. **X-Service-Api-Key header**: per chiamate server-to-server

Le funzioni `handle-email-unsubscribe`, `handle-email-suppression`, `gmail-oauth-callback` e `send-dealer-request-notification` sono pubbliche e non richiedono autenticazione.

## Moduli condivisi (`_shared/`)

| Modulo | Scopo |
|--------|-------|
| `cors.ts` | CORS headers standard |
| `edge-auth.ts` | Validazione JWT e API key |
| `gmail-oauth-config.ts` | Configurazione OAuth Gmail |
| `dealer-account-cleanup.ts` | Pulizia account dealer |
| `transactional-email-templates/` | Template React Email per email transazionali |

## Template Email Transazionali

I template si trovano in `_shared/transactional-email-templates/` e sono registrati in `registry.ts`:

| Template | Trigger |
|----------|---------|
| `order-received` | Ordine ricevuto dal dealer |
| `order-received-admin` | Notifica admin per nuovo ordine |
| `order-confirmed` | Conferma ordine al dealer |
| `order-status-update` | Aggiornamento stato ordine |
| `order-documents-ready` | Documenti ordine disponibili |

## Secrets richiesti

Configurare in Supabase Dashboard > Edge Functions > Secrets:

```
RESEND_API_KEY            - API key Resend per invio email
GMAIL_CLIENT_ID           - Google OAuth client ID
GMAIL_CLIENT_SECRET       - Google OAuth client secret
SUPABASE_SERVICE_ROLE_KEY - Service role key (auto-configurato)
```

## Chiamare una Edge Function dal frontend

```typescript
import { supabase } from "@/integrations/supabase/client";

// Metodo 1: supabase.functions.invoke (aggiunge JWT automaticamente)
const { data, error } = await supabase.functions.invoke("nome-funzione", {
  body: { key: "value" },
});

// Metodo 2: fetch manuale (per maggiore controllo)
const { data: { session } } = await supabase.auth.getSession();
const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nome-funzione`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token}`,
  },
  body: JSON.stringify({ key: "value" }),
});
```

## Error Handling

Tutte le Edge Functions restituiscono errori sanitizzati:
- I dettagli tecnici vengono loggati server-side
- Il client riceve solo `"Internal server error"` generico
- I messaggi user-facing sono gestiti dal frontend via `ERROR_MESSAGES` registry
