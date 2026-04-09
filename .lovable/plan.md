

# Analisi End-to-End del Flusso Dealer — Report Criticità

## Simulazione del flusso completo

Ho analizzato ogni singolo step del ciclo di vita dealer: form pubblico → admin/sales review → approvazione → creazione account → login dealer → catalogo → carrello → ordine → ordini → notifiche → fatture. Ecco tutte le criticità riscontrate, ordinate per gravità.

---

## CRITICITÀ BLOCCANTI (P0)

### 1. Dealer NON può eliminare bozze — RLS mancante su DELETE orders e order_items
**Dove**: `DealerOrders.tsx` → `handleDeleteDraft()`
**Problema**: Il dealer chiama `supabase.from("orders").delete()` e `supabase.from("order_items").delete()`, ma **non esistono policy RLS DELETE** né su `orders` né su `order_items` per il ruolo dealer. L'operazione fallirà silenziosamente con un errore 403/RLS.
**Fix**: Aggiungere policy DELETE per dealer sulle proprie bozze:
```sql
CREATE POLICY "Dealers delete own draft orders" ON orders FOR DELETE TO authenticated
USING (status = 'draft' AND client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Dealers delete own draft order items" ON order_items FOR DELETE TO authenticated
USING (order_id IN (SELECT id FROM orders WHERE status = 'draft' AND client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())));
```

### 2. Dealer NON può aggiornare order_items delle bozze — RLS mancante su UPDATE order_items
**Dove**: `DealerOrders.tsx` → `submitDraft()` chiama `supabase.from("order_items").update()`
**Problema**: Non esiste policy UPDATE su `order_items` per i dealer. La modifica delle quantità nella bozza fallirà.
**Fix**: Aggiungere policy UPDATE per dealer sui propri order_items (solo bozze).

### 3. Magic Link nel wizard di approvazione non funziona
**Dove**: `AdminRequests.tsx` → `handleWizardCreate()` → `create-dealer-account` edge function
**Problema**: Quando l'admin seleziona "Invia Magic Link" nel wizard, il frontend invia comunque `password: wizardData.account_password` all'edge function. L'edge function richiede obbligatoriamente `password` (`if (!password) throw new Error("Missing fields")`). Non c'è nessuna logica per gestire il magic link — il codice crea sempre un utente con password. L'opzione "Magic Link" è un'illusione.
**Fix**: O rimuovere l'opzione magic link, o implementarla nell'edge function con `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })`.

---

## CRITICITÀ IMPORTANTI (P1)

### 4. Dashboard Dealer: lookup listino prezzi sbagliato
**Dove**: `DealerDashboard.tsx` riga 41-48
**Problema**: La dashboard cerca il listino con `price_lists.eq("client_id", client.id)`, ma il sistema usa la junction table `price_list_clients` per l'assegnazione. Se il listino è assegnato via `price_list_clients` (come fa il wizard di approvazione), la dashboard non lo trova.
**Fix**: Allineare la query al pattern usato in `DealerCatalog.tsx` (che usa correttamente `price_list_clients`).

### 5. Discount class hardcoded nella Dashboard
**Dove**: `DealerDashboard.tsx` riga 61
**Problema**: `{ A: 35, B: 25, C: 20, D: 10, custom: 0 }` — i discount tiers sono hardcoded invece di usare la tabella `discount_tiers`. Se un admin cambia le percentuali dalla tabella, la dashboard mostrerà valori sbagliati.
**Fix**: Usare la tabella `discount_tiers` per il lookup.

### 6. CRMCreateOrder: `internal_notes` salvate con UPDATE separato dopo la creazione
**Dove**: `CRMCreateOrder.tsx` riga 203-205
**Problema**: Le note interne vengono salvate con una query UPDATE separata dopo la creazione dell'ordine. Se l'utente sales non ha policy UPDATE su `orders` (e non ce l'ha — solo SELECT e INSERT), le note interne non vengono salvate. 
**Fix**: Aggiungere `internal_notes` come parametro alla RPC `create_order_with_items`, oppure aggiungere una policy UPDATE per sales sui propri ordini.

### 7. Dealer: testi misti italiano/inglese
**Dove**: Molteplici pagine del portale dealer
**Problema**: Inconsistenza linguistica in tutto il portale:
- `DealerCart.tsx`: "Order Review", "Your cart is empty", "Browse Catalog", "Continue Shopping", "Order Notes", "Order Summary", "Minimum order not reached" — tutto in inglese
- `DealerOrders.tsx`: "I Miei Ordini" — in italiano
- `DealerSidebar.tsx`: tutto in inglese ("Dashboard", "Cart", "My Orders", "Support")
- `DealerDashboard.tsx`: "Welcome back", "Active Orders", "Discount Tier" — in inglese
**Fix**: Uniformare tutto in italiano o tutto in inglese.

---

## CRITICITÀ MODERATE (P2)

### 8. Wizard approvazione: duplica il client se esiste già
**Dove**: `AdminRequests.tsx` → `handleWizardCreate()` riga 206
**Problema**: Il wizard crea SEMPRE un nuovo record in `clients` con INSERT, senza controllare se l'organizzazione esiste già (per esempio se è stata creata dal pulsante "Inserisci in Pipeline"). Questo può creare duplicati.
**Fix**: Controllare se esiste un client con la stessa email/company_name prima di crearne uno nuovo.

### 9. Due flussi paralleli e confusionari per le richieste
**Dove**: `AdminRequests.tsx` — pulsanti "Approva" e "Inserisci in Pipeline"
**Problema**: Ci sono due percorsi distinti:
- "Inserisci in Pipeline" → crea client + lead nel CRM, status diventa "converted"
- "Approva" → apre wizard, crea nuovo client + account dealer, status diventa "approved"
Se un admin prima inserisce in pipeline e poi approva, si creano due record `clients` diversi per la stessa azienda. Non c'è collegamento tra i due flussi.
**Fix**: Il wizard di approvazione dovrebbe prima cercare se esiste già un client creato dal pipeline e usarlo, oppure il pulsante "Inserisci in Pipeline" non dovrebbe essere visibile sulle richieste "new" (solo "reviewed").

### 10. Nessuna validazione del form nel wizard di approvazione  
**Dove**: `AdminRequests.tsx` — wizard step navigation  
**Problema**: Il pulsante "Avanti" è disabilitato solo se `company_name` è vuoto (step 0). Non c'è validazione su email, telefono, o campi obbligatori negli step successivi. Si può creare un account senza email.

### 11. Cart: il redirect dopo salvataggio bozza manca
**Dove**: `DealerCart.tsx` riga 131-133
**Problema**: Dopo il salvataggio della bozza, il toast viene mostrato ma non c'è redirect a `/portal/orders`. Il dealer resta sulla pagina del carrello vuoto.
**Fix**: Aggiungere `navigate("/portal/orders")` dopo il toast.

### 12. `validate_order_status_transition` trigger non gestisce draft→submitted
**Dove**: Trigger database `check_order_status_transition`
**Problema**: Il trigger blocca solo terminal states e delivered, ma non valida esplicitamente la transizione draft→submitted. Funziona, ma è fragile — qualsiasi status intermedio viene accettato.

---

## CRITICITÀ MINORI (P3)

### 13. `send-crm-email` nella rejection con `client_id: null`
**Dove**: `AdminRequests.tsx` riga 154 — `client_id: null`
**Problema**: L'edge function potrebbe richiedere un client_id valido. Se non lo gestisce, l'email di rifiuto non verrà mai inviata.

### 14. Sidebar dealer: nessun badge notifiche unread
**Dove**: `DealerSidebar.tsx`
**Problema**: Nonostante il sistema di notifiche real-time sia implementato nel `PortalLayout.tsx` (bell icon nel header), la sidebar non mostra alcun badge sulla voce "Notifications".

### 15. `order_type: "sales_manual"` non mostrato nel portale dealer
**Dove**: `CRMCreateOrder.tsx` riga 193 — imposta `order_type: "sales_manual"`
**Problema**: Nel portale dealer (`DealerOrders.tsx`), non c'è nessuna indicazione che l'ordine è stato creato dal sales. La specifica richiedeva "Ordine creato dal referente commerciale" nel dettaglio ordine.

### 16. BecomeADealer: nessuna validazione `required` sui Select
**Dove**: `BecomeADealer.tsx` righe 174, 188, 202
**Problema**: I campi `<Select required>` non funzionano con i componenti Radix UI. Il form può essere inviato senza zona, paese o business type selezionati.

---

## RIEPILOGO PRIORITÀ

| # | Criticità | Gravità | Effort |
|---|-----------|---------|--------|
| 1 | RLS DELETE mancante orders/order_items | P0 | Basso |
| 2 | RLS UPDATE mancante order_items dealer | P0 | Basso |
| 3 | Magic Link non implementato nell'edge function | P0 | Medio |
| 4 | Dashboard: lookup listino errato | P1 | Basso |
| 5 | Discount class hardcoded | P1 | Basso |
| 6 | Sales non può salvare internal_notes | P1 | Basso |
| 7 | Testi misti it/en nel portale | P1 | Medio |
| 8 | Wizard duplica client se pipeline già usato | P2 | Medio |
| 9 | Due flussi paralleli confusionari | P2 | Medio |
| 10 | Nessuna validazione wizard steps | P2 | Basso |
| 11 | Redirect mancante dopo salvataggio bozza | P2 | Basso |
| 12 | Trigger status transition fragile | P2 | Basso |
| 13 | Rejection email con client_id null | P3 | Basso |
| 14 | Sidebar: no badge notifiche | P3 | Basso |
| 15 | Nessuna label "ordine creato dal sales" | P3 | Basso |
| 16 | Select required non funziona | P3 | Basso |

---

## PIANO DI IMPLEMENTAZIONE

Propongo di risolvere tutte le criticità in questo ordine:

1. **Migration SQL**: Aggiungere policy RLS mancanti (DELETE orders, DELETE/UPDATE order_items per dealer)
2. **Edge function**: Fix magic link o rimozione opzione
3. **DealerDashboard**: Fix lookup listino + discount tiers da DB
4. **CRMCreateOrder**: Aggiungere policy UPDATE orders per sales, o aggiungere internal_notes alla RPC
5. **AdminRequests wizard**: Deduplica client, validazione form
6. **DealerCart**: Redirect dopo bozza
7. **Portale dealer**: Uniformare lingua in italiano, aggiungere label "ordine dal sales"
8. **Varie**: Fix minori (badge sidebar, select validation, rejection email)

