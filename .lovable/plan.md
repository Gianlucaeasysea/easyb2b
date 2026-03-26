
Obiettivo: sbloccare il collegamento Gmail senza continuare a inseguire un’impostazione Google sbagliata.

1. Conferma della causa
- Il messaggio “Dominio non valido: deve essere un dominio privato di primo livello” arriva dalla schermata “Authorized domains” di Google.
- Quella schermata non accetta:
  - URL completi come `https://www.googleapis.com/auth/gmail.readonly`
  - callback URL come `https://.../functions/v1/gmail-oauth-callback`
  - domini condivisi di piattaforma come `supabase.co` in molti casi
- Quindi il problema non è il codice dello scope, ma dove lo stai inserendo in Google Cloud.

2. Cosa va configurato davvero in Google
- `https://www.googleapis.com/auth/gmail.readonly` va messo solo negli Scope della schermata consenso OAuth:
  - Google Cloud → APIs & Services → OAuth consent screen → Scopes → Add or Remove Scopes
- Il callback va messo solo qui:
  - Google Cloud → APIs & Services → Credentials → OAuth 2.0 Client IDs → il tuo client → Authorized redirect URIs
  - valore: `https://irauraejdmkjkrbdudra.supabase.co/functions/v1/gmail-oauth-callback`
- In “Authorized domains” non devi inserire né lo scope né il callback completo.

3. Cosa fare con “Authorized domains”
- Se Google ti obbliga a compilare il campo, inserisci solo il dominio base che possiedi davvero, ad esempio:
  - `easysea.org`
- Non inserire:
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `irauraejdmkjkrbdudra.supabase.co`
  - URL con `https://`
  - path come `/functions/v1/...`
- Se non hai un dominio tuo verificato in Google, può essere necessario lasciare vuoto quel campo oppure usare un dominio proprietario già verificato nel progetto Google.

4. Stato attuale del progetto
- Il flusso nel codice punta correttamente a:
  - funzione di collegamento: `gmail-oauth-callback`
  - redirect URI costruito da `SUPABASE_URL/functions/v1/gmail-oauth-callback`
  - scope Gmail readonly corretto
- Il problema operativo attuale è che il database non ha ancora token Gmail salvati:
  - `gmail_tokens` contiene 0 righe
- Per questo “Sincronizza” restituisce:
  - `{"error":"Gmail not connected","needs_auth":true}`

5. Implementazione che farei dopo la tua conferma
- Migliorare il flusso CRM per mostrare errori più chiari:
  - distinguere “Gmail non collegato” da “errore sync”
  - mostrare un banner con i passi da fare
- Aggiungere una verifica reale dello stato connessione Gmail invece di `return true`
- Gestire meglio il ritorno dalla callback:
  - redirect al CRM con messaggio di successo/errore invece di pagina HTML statica
- Aggiungere logging più esplicito nella callback per capire subito se fallisce:
  - autorizzazione Google
  - scambio token
  - salvataggio token

6. Come verificare subito, senza toccare codice
- In Google Cloud:
  - Scopes: aggiungi `https://www.googleapis.com/auth/gmail.readonly`
  - Authorized redirect URIs: lascia `https://irauraejdmkjkrbdudra.supabase.co/functions/v1/gmail-oauth-callback`
  - Authorized domains: usa solo `easysea.org` se richiesto
  - Test users: assicurati che `business@easysea.org` sia presente
  - Gmail API: deve essere abilitata
- Poi riprova:
  - clicca “Collega Gmail”
  - completa il consenso Google
  - verifica che compaia “Gmail collegato con successo”
  - poi clicca “Sincronizza”

7. Dettaglio tecnico
```text
Dove va ogni valore:

Scope:
OAuth consent screen -> Scopes
https://www.googleapis.com/auth/gmail.readonly

Redirect URI:
Credentials -> OAuth Client ID -> Authorized redirect URIs
https://irauraejdmkjkrbdudra.supabase.co/functions/v1/gmail-oauth-callback

Authorized domains:
OAuth consent screen -> App domain
easysea.org   (solo se possiedi/verifichi questo dominio)
```

8. Risultato atteso dopo la correzione
- “Collega Gmail” non deve più fermarsi su errore Google
- la callback deve salvare una riga in `gmail_tokens`
- “Sincronizza” deve smettere di rispondere `Gmail not connected`

Se approvi, il passo successivo è che io prepari un intervento piccolo ma utile sul codice per:
- mostrare messaggi migliori in CRM
- verificare davvero lo stato di collegamento
- reindirizzare correttamente l’utente dopo il consenso Google
