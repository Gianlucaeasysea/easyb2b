

# Piano di Implementazione — 6 Prompt (A1-A3, D1-D3)

Questo è un piano complesso che copre 6 aree di intervento tra Admin e Dealer Portal. Data la dimensione, si consiglia di procedere in blocchi sequenziali.

---

## BLOCCO 1: A1 — Wizard Approvazione Dealer

### Database
- Aggiungere colonna `admin_notes TEXT` alla tabella `distributor_requests`

### UI — Riscrittura `AdminRequests.tsx`
- Aggiungere filtro status: Tutte / In attesa / Approvate / Rifiutate
- Migliorare modal "Rivedi" con campo `admin_notes` editabile e salvabile
- Creare componente **ApprovalWizard** (dialog multi-step):
  - **Step 1**: Dati azienda pre-compilati dal form, editabili. Dropdown termini di pagamento.
  - **Step 2**: Dropdown listino prezzi (da `price_lists`), dropdown sales rep (utenti con ruolo `sales` da `user_roles` + `profiles`)
  - **Step 3**: Email (editabile), genera password random, checkbox "Invia email benvenuto"
  - **Step 4**: Riepilogo, pulsante "Crea Account"
- Al click "Crea Account": invocare edge function `create-dealer-account` (già esistente, da estendere per accettare `payment_terms`, `price_list_id`, `assigned_sales_id`)
- Dialog rifiuto con textarea motivo obbligatorio
- Badge contatore richieste pendenti nella sidebar admin

### Edge Function
- Estendere `create-dealer-account` per accettare e salvare: `payment_terms`, `assigned_sales_id`, `price_list_id` (inserire anche in `price_list_clients`)

---

## BLOCCO 2: A2 — Eliminazione discount_class, solo listini

### Codebase (162 match in 15 file)
- Rimuovere `discount_class` da tutti i form di creazione/modifica client (AdminClients, AdminClientDetail, CRMLeads, CRMOrganizationDetail, DataImporter)
- In AdminClientDetail: sostituire dropdown discount_class con sezione "Listino Prezzi" (nome listino assegnato, link, pulsante "Cambia Listino")
- In AdminPriceLists: rimuovere riferimenti a discount_class nelle card clienti
- In AdminSystemMap: aggiornare descrizioni
- NON rimuovere la colonna dal DB (backward compatibility), solo deprecarla

### Database
- Aggiungere `price_list_id UUID` alla tabella `clients` (se non esiste già, verificare — esiste già `price_list_clients` come tabella ponte)
- Migrazione con commento deprecazione

### Pricing Logic
- Verificare che il catalogo dealer e il carrello calcolino i prezzi esclusivamente dai listini, non da discount_class

---

## BLOCCO 3: A3 — Termini di Pagamento

### Database
- `ALTER TABLE clients ADD COLUMN payment_terms TEXT DEFAULT '30_days'`
- `ALTER TABLE clients ADD COLUMN payment_terms_notes TEXT`
- `ALTER TABLE orders ADD COLUMN payment_terms TEXT`
- Trigger di validazione per i valori ammessi (prepaid, 30_days, 60_days, 90_days, end_of_month)

### UI Admin
- Aggiungere dropdown "Termini di Pagamento" nei form client (AdminClients, AdminClientDetail)
- Mostrare payment_terms nel dettaglio ordine admin

### UI Dealer
- In DealerCart: mostrare card read-only "Termini di Pagamento" prima del riepilogo
- Alla creazione ordine: copiare `client.payment_terms` nell'ordine
- Nel dettaglio ordine dealer: mostrare termini e calcolo scadenza

---

## BLOCCO 4: D1 — Duplica Ordine

### UI Dealer
- In DealerOrders: aggiungere pulsante "Duplica" (icona Copy) su ogni riga ordine (nascosto se `cancelled`)
- Dialog di conferma con messaggio italiano
- Logica:
  1. Fetch order_items dell'ordine originale
  2. Verificare disponibilità prodotti (active_b2b, stock)
  3. Ricalcolare prezzi dal listino attuale del cliente
  4. Creare nuovo ordine `status = "draft"` con i nuovi items
  5. Toast con warning se prodotti esclusi
  6. Redirect al nuovo ordine (o espandere in lista)

---

## BLOCCO 5: D2 — Fix Timeline dopo "Pagato"

### Analisi
- Il componente `OrderEventsTimeline` è un semplice fetch di `order_events` — non filtra per status, quindi non dovrebbe "sparire"
- Il progress bar in DealerOrders ha solo 5 fasi e non include "Pagato"
- `EVENT_ICONS` e `EVENT_COLORS` non hanno entry per `payment_received`

### Fix
- Aggiungere `payment_received` a `EVENT_ICONS` (icona CheckCircle verde) e `EVENT_COLORS`
- Nella progress bar di DealerOrders: aggiungere fase "Pagato" condizionale (se `payment_status === "paid"`)
- Gestire caso "cancelled" con marker rosso nella progress bar
- Verificare che il cambio `payment_status` generi un evento in `order_events` (se non esiste trigger, crearne uno)

### Database
- Creare trigger: quando `orders.payment_status` cambia a `paid`, inserire evento `payment_received` in `order_events`

---

## BLOCCO 6: D3 — Bozza dal Carrello con Deal

### UI Dealer
- In DealerCart: aggiungere pulsante "Salva come Bozza" (secondary) accanto a "Conferma Ordine"
- Textarea note già presente — riutilizzarla
- Logica: creare ordine con `status = "draft"`, inserire items, svuotare carrello

### Deal Automatico
- Modificare il trigger `create_deal_from_order` esistente per gestire anche `status = 'draft'`:
  - Stage: `"new"` (non `"closed_won"`)
  - Source: `"dealer_draft"`
  - Probability: 50 (non 100)
- Oppure creare trigger separato `create_deal_from_draft`

### DealerOrders — Gestione Bozze
- Mostrare bozze in cima con badge "Bozza"
- Pulsante "Apri e Completa" che porta al dettaglio editabile
- Nel dettaglio bozza: modifica quantità, rimuovi items, conferma o elimina
- Al passaggio draft→confirmed: aggiornare deal a stage `closed_won`
- All'eliminazione bozza: aggiornare deal a stage `closed_lost`

### CRM Pipeline
- I deal con `source = "dealer_draft"` mostrano badge/icona distintiva nelle card Kanban

---

## Ordine di Implementazione Consigliato

1. **A3** (payment_terms) — migrazioni DB fondamentali, poche dipendenze
2. **A2** (rimozione discount_class) — refactor ampio ma indipendente
3. **A1** (wizard approvazione) — dipende da A2 e A3
4. **D2** (fix timeline) — bug fix indipendente
5. **D1** (duplica ordine) — feature indipendente
6. **D3** (bozza + deal) — feature più complessa

### File Principali Coinvolti
- `src/pages/admin/AdminRequests.tsx` — riscrittura completa (A1)
- `src/pages/admin/AdminClientDetail.tsx` — refactor discount_class (A2), payment_terms (A3)
- `src/pages/admin/AdminClients.tsx` — refactor (A2, A3)
- `src/pages/portal/DealerCart.tsx` — bozza (D3), payment_terms display (A3)
- `src/pages/portal/DealerOrders.tsx` — duplica (D1), bozze (D3), fix timeline (D2)
- `src/components/OrderEventsTimeline.tsx` — fix (D2)
- `supabase/functions/create-dealer-account/index.ts` — estensione (A1)
- ~15 file per cleanup `discount_class` (A2)
- 4-5 migrazioni DB

### Note Tecniche
- Usare validation triggers (non CHECK constraints) per `payment_terms`
- Il trigger `create_deal_from_order` esistente ignora i draft (`IF NEW.status = 'draft'` non è gestito) — va esteso
- La tabella `price_list_clients` esiste già come tabella ponte — non serve aggiungere `price_list_id` su `clients` se si usa quella

