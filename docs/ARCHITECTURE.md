# Architettura EasyB2B

## Overview

EasyB2B è una piattaforma multi-tenant B2B/CRM con tre portali distinti:

```
Browser
  ├── /portal    → Dealer Portal (React SPA)
  ├── /admin     → Admin Panel (React SPA)
  └── /crm       → CRM (React SPA)
          │
          ▼
    Supabase
      ├── PostgreSQL (database principale)
      │     └── Row-Level Security (RLS per multi-tenancy)
      ├── Auth (email/password)
      ├── Edge Functions (business logic server-side)
      ├── Realtime (aggiornamenti live)
      └── Storage (documenti, file)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 5 |
| Styling | Tailwind CSS v3 + shadcn/ui |
| State | TanStack React Query v5 |
| Routing | React Router v6 |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, Storage) |
| i18n | i18next + react-i18next |
| Email | Resend + React Email templates |
| Integrations | Shopify (product sync), Gmail (OAuth) |

## Autenticazione e Autorizzazione

### Flusso di login
1. L'utente inserisce credenziali
2. Supabase Auth restituisce JWT
3. Il frontend legge il ruolo da `user_roles` table
4. Il ruolo viene cachato in sessionStorage (chiave: `user_role_{userId}`)
5. `ProtectedRoute` verifica il ruolo prima di renderizzare la pagina

### Ruoli disponibili
- `admin`: accesso completo a tutto
- `dealer`: solo portale, solo propri ordini/dati
- `sales`: solo CRM, solo clienti assegnati
- `operations`: pannello admin (ordini e prodotti, no pricing strategico)

### Row-Level Security (RLS)
Ogni tabella ha policy RLS che replicano le stesse regole del frontend.
Anche se un utente aggirasse il routing frontend, il DB negherebbe l'accesso.

## Flusso Ordini

```
[Dealer] Aggiungi al carrello (localStorage con debounce 500ms)
    ↓
[Dealer] Crea bozza ordine (status: draft)
    ↓
[Dealer] Invia ordine (status: submitted)
    ↓  ← Email notifica admin (send-order-notification)
[Admin] Conferma ordine (status: confirmed)
    ↓
[Admin] Mette in lavorazione (status: processing)
    ↓
[Admin] Pronto per spedizione (status: ready_to_ship)
    ↓
[Admin] Spedito (status: shipped) + tracking info
    ↓  ← Email notifica dealer
[Admin] Consegnato (status: delivered)
```

## Edge Functions

| Funzione | Scopo | Auth |
|----------|-------|------|
| `create-dealer-account` | Crea account dealer da admin | JWT |
| `reset-dealer-password` | Reset password dealer | JWT |
| `send-order-notification` | Email conferma ordine | JWT |
| `send-transactional-email` | Email transazionali (queue) | JWT/API Key |
| `process-email-queue` | Processa coda email | JWT |
| `preview-transactional-email` | Anteprima template email | JWT |
| `handle-email-unsubscribe` | Gestione unsubscribe | Pubblica |
| `handle-email-suppression` | Gestione bounce/complaint | Pubblica |
| `send-crm-email` | Email dal CRM | JWT |
| `generate-email-draft` | Genera bozza email con AI | JWT |
| `gmail-oauth-callback` | Callback OAuth Gmail | Pubblica |
| `gmail-exchange-code` | Scambio codice OAuth | JWT |
| `gmail-connection-status` | Verifica connessione Gmail | JWT |
| `gmail-sync-inbox` | Sincronizza inbox Gmail | JWT |
| `crm-entity-actions` | Azioni batch su entità CRM | JWT |
| `send-dealer-request-notification` | Notifica nuova richiesta dealer | Pubblica |
| `shopify-sync` | Sincronizzazione prodotti Shopify | JWT |
| `gsheet-sync` | Sincronizzazione Google Sheets | JWT |
| `sync-order-from-platform` | Importa ordine da piattaforma | JWT |

## Struttura Database (tabelle principali)

### User Management
- `auth.users` — gestito da Supabase Auth
- `profiles` — dati aziendali utente (company_name, zone, phone)
- `user_roles` — ruolo assegnato: admin | dealer | sales | operations

### B2B Sales
- `clients` — aziende dealer con classe sconto e stato
- `client_contacts` — contatti multipli per cliente
- `client_shipping_addresses` — indirizzi di consegna
- `client_bank_details` — IBAN e condizioni pagamento
- `client_documents` — documenti cliente (contratti, certificati)
- `client_notifications` — notifiche per dealer
- `client_notification_preferences` — preferenze notifica

### Catalogo e Pricing
- `products` — prodotti sincronizzati da Shopify (`active_b2b` flag)
- `product_details` — schede tecniche, galleria, specifiche
- `price_lists` — listini personalizzati per cliente/categoria
- `price_list_items` — prezzo custom per prodotto in un listino
- `price_list_clients` — assegnazione listini a clienti (M:N)
- `discount_tiers` — tier standard (Gold, Silver, Bronze, Standard)

### Ordini
- `orders` — ordine con status lifecycle completo
- `order_items` — righe ordine con quantità e prezzi al momento dell'ordine
- `order_documents` — allegati (fatture, DDT, conferme)
- `order_events` — timeline eventi ordine

### CRM
- `leads` — prospect con source e status (pipeline Kanban)
- `deals` — opportunità con valore e probabilità
- `activities` — call, email, meeting, note
- `tasks` — task assegnabili con priorità e scadenze
- `automation_rules` — regole automazione workflow
- `automation_logs` — log esecuzioni automazioni

### Comunicazioni
- `client_communications` — storico email inviate/ricevute
- `email_templates` — template email riutilizzabili
- `gmail_tokens` — token OAuth Gmail per integrazione

## Struttura Cartelle

```
src/
├── components/
│   ├── admin/           # Componenti pannello admin
│   ├── crm/             # Componenti CRM
│   ├── landing/         # Landing page pubblica
│   ├── portal/          # Componenti portale dealer
│   └── ui/              # shadcn/ui + componenti base
├── contexts/            # React Context (Auth, Cart, ClientMode)
├── hooks/               # Custom hooks (useClientDetail, useOrderDraft, etc.)
├── i18n/                # Internazionalizzazione
│   └── locales/en/      # Traduzioni inglese (6 namespace)
├── integrations/supabase/ # Client e types auto-generati
├── layouts/             # Layout con sidebar (Admin, CRM, Portal)
├── lib/                 # Utility, costanti, error handling
├── pages/
│   ├── admin/           # Pagine admin (~15 pagine)
│   ├── crm/             # Pagine CRM (~15 pagine)
│   └── portal/          # Pagine dealer (~10 pagine)
├── types/               # TypeScript types
└── test/                # Test setup

supabase/
├── functions/           # Edge Functions (Deno)
│   ├── _shared/         # Moduli condivisi (CORS, auth, templates)
│   └── [nome-funzione]/ # Una cartella per funzione
├── migrations/          # SQL migrations
└── config.toml          # Configurazione Supabase

tests/
└── e2e/                 # Test E2E Playwright
    ├── helpers/         # Auth e data helpers
    ├── dealer/          # Test flussi dealer
    ├── admin/           # Test flussi admin
    └── crm/             # Test flussi CRM
```
