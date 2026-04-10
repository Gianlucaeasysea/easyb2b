// Messaggi di errore user-facing (in italiano, mostrati nei toast)
export const ERROR_MESSAGES = {
  // Autenticazione
  AUTH_LOGIN_FAILED: 'Credenziali non valide. Controlla email e password.',
  AUTH_SESSION_EXPIRED: 'Sessione scaduta. Effettua nuovamente il login.',
  AUTH_UNAUTHORIZED: 'Non hai i permessi per eseguire questa operazione.',
  AUTH_GMAIL_FAILED: 'Autenticazione Gmail fallita. Riprova.',
  AUTH_GMAIL_POPUP_BLOCKED: 'Il popup Gmail è stato bloccato. Abilita i popup per questo sito.',
  AUTH_ROLE_LOAD_FAILED: 'Impossibile caricare il ruolo utente. Riprova.',

  // Ordini
  ORDER_CREATE_FAILED: 'Impossibile creare l\'ordine. Riprova.',
  ORDER_SUBMIT_FAILED: 'Impossibile inviare l\'ordine. Verifica i dati e riprova.',
  ORDER_UPDATE_FAILED: 'Impossibile aggiornare l\'ordine.',
  ORDER_DELETE_FAILED: 'Impossibile eliminare l\'ordine.',
  ORDER_PRICE_CHANGED: 'Alcuni prezzi sono cambiati. Verifica il riepilogo ordine.',
  ORDER_OUT_OF_STOCK: 'Alcuni prodotti non sono più disponibili in quantità sufficiente.',
  ORDER_STATUS_TRANSITION_INVALID: 'Questa operazione non è permessa per lo stato attuale dell\'ordine.',
  ORDER_NO_ITEMS: 'Questo ordine non contiene prodotti da duplicare.',
  ORDER_NO_PRODUCTS: 'Nessun prodotto disponibile per la duplicazione.',
  ORDER_NOTES_SAVE_FAILED: 'Impossibile salvare le note.',

  // Prodotti e catalogo
  PRODUCT_LOAD_FAILED: 'Impossibile caricare il catalogo prodotti.',
  PRODUCT_UPDATE_FAILED: 'Impossibile aggiornare il prodotto.',
  PRODUCT_PRICE_UNAVAILABLE: 'Impossibile aggiungere: prezzo non disponibile.',

  // Clienti
  CLIENT_LOAD_FAILED: 'Impossibile caricare i dati del cliente.',
  CLIENT_UPDATE_FAILED: 'Impossibile aggiornare i dati del cliente.',
  CLIENT_DELETE_FAILED: 'Impossibile eliminare il cliente.',
  CLIENT_CREATE_FAILED: 'Impossibile creare il cliente.',
  CLIENT_EMAIL_REQUIRED: 'Il cliente deve avere un indirizzo email.',
  CLIENT_PASSWORD_TOO_SHORT: 'La password deve essere di almeno 10 caratteri.',

  // Price lists
  PRICE_LIST_LOAD_FAILED: 'Impossibile caricare i listini prezzi.',
  PRICE_LIST_IMPORT_FAILED: 'Import fallito. Verifica il formato del file.',
  PRICE_LIST_UPDATE_FAILED: 'Impossibile aggiornare il listino prezzi.',
  PRICE_LIST_SELECT_REQUIRED: 'Seleziona un listino.',
  PRICE_LIST_MAP_PRICE: 'Mappa almeno il campo Prezzo.',
  PRICE_LIST_MAP_IDENTIFIER: 'Mappa almeno Nome Prodotto o SKU.',
  PRICE_LIST_NO_MATCH: 'Nessun prodotto trovato.',

  // Email e comunicazioni
  EMAIL_SEND_FAILED: 'Impossibile inviare l\'email. Riprova.',
  EMAIL_LOAD_FAILED: 'Impossibile caricare le comunicazioni.',
  EMAIL_FILL_REQUIRED: 'Compila oggetto e corpo dell\'email.',
  EMAIL_SELECT_RECIPIENT: 'Seleziona un destinatario.',
  EMAIL_SELECT_DATE: 'Seleziona una data per la pianificazione.',
  EMAIL_MAX_ATTACHMENTS: 'Massimo 5 allegati consentiti.',
  EMAIL_FILE_TOO_LARGE: 'Il file supera il limite di 10MB.',
  GMAIL_SYNC_FAILED: 'Sincronizzazione Gmail fallita.',
  GMAIL_TOKEN_EXPIRED: 'Il token Gmail non è più valido. Ricollega Gmail.',

  // Documenti e file
  FILE_TOO_LARGE: 'Il file non può superare 10MB.',
  FILE_EMPTY: 'Il file è vuoto.',
  UPLOAD_FAILED: 'Caricamento fallito. Riprova.',
  DELETE_FAILED: 'Impossibile eliminare. Riprova.',

  // CMS
  CMS_VIDEO_URL_REQUIRED: 'URL video obbligatorio.',
  CMS_UPLOAD_FAILED: 'Upload fallito. Riprova.',

  // Contatti
  CONTACT_NAME_REQUIRED: 'Il nome è obbligatorio.',
  CONTACT_SAVE_FAILED: 'Impossibile salvare il contatto.',
  CONTACT_UPDATE_FAILED: 'Impossibile aggiornare il contatto.',
  CONTACT_DELETE_FAILED: 'Impossibile eliminare il contatto.',

  // Generico
  GENERIC_ERROR: 'Si è verificato un errore. Riprova.',
  NETWORK_ERROR: 'Errore di connessione. Verifica la tua connessione internet.',
  LOAD_FAILED: 'Impossibile caricare i dati.',
  SAVE_FAILED: 'Impossibile salvare. Riprova.',
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

export function getErrorMessage(key: ErrorMessageKey): string {
  return ERROR_MESSAGES[key];
}
