# Come contribuire al progetto

## Flusso di sviluppo

1. Crea un branch dal main: `git checkout -b feature/nome-feature`
2. Sviluppa la feature
3. Assicurati che `bun run lint` non abbia errori
4. Assicurati che `bun run build` completi senza errori TypeScript
5. Apri una Pull Request verso main

## Convenzioni di codice

- **Componenti**: PascalCase, un componente per file
- **Hook**: camelCase con prefisso `use` (es: `useClientDetail`)
- **Utilities**: camelCase in `src/lib/`
- **Tipi**: PascalCase in `src/types/`
- **Test E2E**: cartella `tests/e2e/` con suffisso `.spec.ts`
- **Test unitari**: stesso nome del file testato + `.test.ts` in `src/`

## Struttura dei commit

```
tipo: descrizione breve

Esempi:
feat: aggiungi filtro per zona nella lista clienti
fix: correggi calcolo totale ordine con sconto
refactor: split AdminClientDetail in componenti separati
test: aggiungi E2E test per flusso checkout dealer
docs: aggiorna ARCHITECTURE.md con nuove tabelle
```

## Variabili d'ambiente

Copia `.env.example` in `.env.local` e compila i valori.
Non committare mai `.env.local` o file con credenziali.

## Error Messages

I messaggi di errore user-facing sono centralizzati in `src/lib/errorMessages.ts`.
Non usare stringhe hardcoded nei toast — importa da `ERROR_MESSAGES`.

## Internazionalizzazione (i18n)

Le traduzioni sono in `src/i18n/locales/en/` divise in 6 namespace:
`common`, `orders`, `admin`, `crm`, `auth`, `errors`.

Per usare una traduzione:
```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation('orders');
return <span>{t('status.processing')}</span>;
```

## Database migrations

Le migrations sono gestite automaticamente da Lovable Cloud.
Non modificare direttamente i file in `supabase/migrations/`.
