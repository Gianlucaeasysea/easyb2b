

# Piano di implementazione — Multi-fix e miglioramenti

Questo piano copre 10 interventi distinti organizzati in 4 aree.

---

## AREA 1: Form "Become a Dealer"

### 1.1 Aggiungere campo Country (paese) oltre a Region (continente)
- Aggiungere al form state un campo `country` (testo libero o input)
- Inserire un campo Input "Country" sotto il Select "Region" nel grid
- Salvare il valore nel campo `country` della tabella `distributor_requests` (la colonna NON esiste: servira una migrazione per aggiungere `country TEXT` alla tabella)

### 1.2 Campo VAT ID (opzionale)
- Aggiungere `vat_number` al form state
- Aggiungere campo Input "VAT ID (optional)" nel form
- Migrazione: aggiungere colonna `vat_number TEXT` a `distributor_requests`

### 1.3 Fix campo Website — non forzare https
- Cambiare `type="url"` a `type="text"` nell'input website
- Nella submit, normalizzare: se il valore non inizia con `http://` o `https://`, prepend `https://`

### 1.4 Email automatiche su invio form
- Creare edge function `send-dealer-request-notification` che:
  - Invia email di conferma al cliente (es. "Abbiamo ricevuto la tua candidatura")
  - Invia notifica a sales (`business@easysea.org`) con CC a `g.scotto@easysea.org`
- Chiamare la funzione dopo l'insert nella submit del form `BecomeADealer.tsx`

---

## AREA 2: Sezione Sales / CRM

### 2.1 Approvazione richiesta dealer → crea Organization + Contact automaticamente
- In `CRMRequests.tsx` (e `AdminRequests.tsx`), quando si clicca "Convert to Lead" / "Pipeline":
  - Creare anche un record in `clients` (organization) con status "lead"
  - Creare un record in `client_contacts` come contatto primario
  - Linkare il lead al `client_id` dell'organizzazione appena creata
  - Includere `country` e `vat_number` dai nuovi campi

### 2.2 Creazione lead manuale → auto-crea Organization
- In `CRMLeads.tsx`, quando si aggiunge un lead (`addLead`), dopo l'insert:
  - Creare automaticamente un'organizzazione (`clients`) con status "lead"
  - Creare contatto primario (`client_contacts`)
  - Aggiornare il lead con il `client_id` risultante
- Aggiungere pulsante "Add Organization" nella pagina Organizations per creazione manuale diretta

### 2.3 Leads — Doppia vista (Lista + Kanban) con fasi personalizzate
- Aggiungere toggle List/Kanban nella pagina Leads
- Nuovi status lead: `request`, `contact`, `qualification`, `onboarding`, `first_order`, `lost`, `nurturing`
- Vista Kanban con colonne drag-and-drop per ogni fase (usando `@hello-pangea/dnd` gia presente)
- Ogni card mostra: azienda, contatto, email, telefono, tempo nello stage
- Azioni rapide (email, call, WhatsApp) disponibili da entrambe le viste

### 2.4 Assegnare listino e classi sconto dal CRM
- Nel dettaglio Organizzazione (`CRMOrganizationDetail.tsx`), aggiungere tab/sezione per:
  - Assegnare/rimuovere listini prezzi (usando `price_list_clients`)
  - Cambiare classe sconto del client (`discount_class` su `clients`)

---

## AREA 3: Sezione Admin

### 3.1 Assegnare listino dal profilo cliente / dealer request
- In `AdminClientDetail.tsx`, aggiungere sezione per gestire listini assegnati
- In `AdminRequests.tsx`, nel flusso di conversione, opzione per assegnare listino

### 3.2 Duplicare un listino
- In `AdminPriceLists.tsx`, aggiungere pulsante "Duplica" sul listino selezionato
- Copia nome (+ " (copia)"), descrizione, e tutti i `price_list_items` associati

### 3.3 Nuovi ordini — aggiornamento dinamico real-time
- Il hook `useNewOrderNotifications` gia ascolta INSERT su `orders`, ma la query `admin-new-orders` non si invalida
- Aggiungere `queryClient.invalidateQueries({ queryKey: ["admin-new-orders"] })` nel callback del realtime listener
- Abilitare realtime sulla tabella orders: `ALTER PUBLICATION supabase_realtime ADD TABLE public.orders`

### 3.4 Email credenziali al dealer alla creazione account
- Modificare l'edge function `create-dealer-account` per inviare email al dealer con le credenziali (email + password + link portale) dopo la creazione dell'account
- Utilizzare il sistema di email transazionali gia configurato

---

## Dettagli tecnici

### Migrazioni DB necessarie
1. `ALTER TABLE distributor_requests ADD COLUMN country TEXT, ADD COLUMN vat_number TEXT;`
2. `ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;`
3. Update lead statuses: i nuovi status (`request`, `contact`, `qualification`, `onboarding`, `first_order`, `nurturing`) verranno gestiti lato applicativo senza check constraint

### File principali da modificare
- `src/pages/BecomeADealer.tsx` — form fields + submit logic
- `src/pages/crm/CRMRequests.tsx` + `src/pages/admin/AdminRequests.tsx` — auto-create org+contact
- `src/pages/crm/CRMLeads.tsx` — dual view, new stages, auto-create org
- `src/pages/crm/CRMOrganizations.tsx` — manual add organization button
- `src/pages/crm/CRMOrganizationDetail.tsx` — price list assignment
- `src/pages/admin/AdminClientDetail.tsx` — price list assignment
- `src/pages/admin/AdminPriceLists.tsx` — duplicate list button
- `src/pages/admin/AdminNewOrders.tsx` — realtime query invalidation
- `src/hooks/useNewOrderNotifications.ts` — invalidate admin-new-orders query
- `supabase/functions/create-dealer-account/index.ts` — send credentials email
- Nuova edge function: `supabase/functions/send-dealer-request-notification/index.ts`

### Edge Functions
- **send-dealer-request-notification**: conferma cliente + notifica sales con CC giuseppe
- **create-dealer-account**: aggiungere invio email con credenziali dopo creazione

