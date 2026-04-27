# Reportistica — Piano fix n8n: tipi canonici e phantom params

**Workflow target:** `Get_Report_Parameters` (id `b94XKGYOzpHdgo4F`)
**Endpoint:** `GET /webhook/get-params?reportId={id}`
**Stato:** PIANO — non ancora applicato.

## Contesto

Test su un campione di 10 report (vedi sessione del 2026-04-27) ha evidenziato due
incongruenze nel payload restituito da `get-params`. Entrambe sono dati malformati alla
sorgente; il frontend `app/pages/ReportisticaPage.tsx` riesce comunque a renderizzare
qualcosa ma non come da contratto.

## Bug #1 — `parameter_type` non normalizzato

### Sintomo
Per **101 parametri** distribuiti su tutti i report, il campo `type` nel JSON di risposta
è uno dei seguenti, presi tal quali dal DB:

| Valore restituito | Conteggio | Cosa il frontend si aspetta |
|---|---|---|
| `"Date"` | 52 | `"date"` |
| `"String"` | 46 | `"text"` (no options) o `"select"` (con options) |
| `"Integer"` | 3 | `"number"` |
| `"Object"` | 1 | da chiarire (probabilmente `"text"`) |

Il frontend (`renderParam`, switch su `param.type`) non matcha nessuno di questi valori
e cade sempre nel ramo `default:` → ogni input viene reso come `<Input type="text">`.
Date diventano testo libero, dropdown spariscono, numeri perdono il pad numerico.

### Causa
Nodo **`Code: Format Parameters`** (id `f28091e5-a966-4802-81e7-044fca099c11`):
```js
const parameters = paramsList.map(p => ({
  name: p.parameter_name,
  label: p.parameter_label,
  type: p.parameter_type,        // ← passa attraverso il valore raw del DB
  required: p.is_required,
  default: p.default_value,
  order: p.parameter_order,
  options: p.options || null
}));
```
Il valore di `parameter_type` viene dalla tabella Postgres `public.pe_parameter`,
colonna `parameter_type`, dove sono salvati i nomi nella forma capitalizzata.

### Fix proposto
Aggiungere una funzione di normalizzazione **dentro** lo stesso nodo `Code: Format
Parameters`. Mapping:

```js
const normalizeType = (rawType, hasOptions) => {
  const t = (rawType || "").trim().toLowerCase();
  if (t === "date")    return "date";
  if (t === "integer" || t === "int" || t === "number") return "number";
  if (t === "string") return hasOptions ? "select" : "text";
  if (t === "object") return "text";   // fallback prudente per il singolo caso
  return "text";                        // fallback generico
};
```

Sostituire il map:
```js
const parameters = paramsList.map(p => {
  const opts = p.options || null;
  const hasOptions = Array.isArray(opts) && opts.length > 0;
  return {
    name: p.parameter_name,
    label: p.parameter_label,
    type: normalizeType(p.parameter_type, hasOptions),
    required: !!p.is_required,           // bonus: forza booleano
    default: p.default_value,
    order: p.parameter_order,
    options: opts,
  };
});
```

**Note sul mapping:**
- Trasformiamo `"String"` → `"select"` solo se ci sono opzioni. Altrimenti `"text"`.
  Questa regola riflette il comportamento corrente del DB: per i parametri "select" il
  campo `subquery_id` viene popolato, le opzioni vengono caricate, e arrivano qui dentro
  a `p.options`. Per i parametri text-libero il subquery_id è null e `options` è null.
- `Object` (1 occorrenza) → fallback a `"text"`. Va investigato a parte: aprire un task
  per identificare quale parametro/report usa `Object` e decidere se è un errore di
  inserimento o un caso reale (es. JSON serializzato).

### Test post-fix
```bash
# Atteso: type="select", options popolato
curl -s "http://localhost:5678/webhook/get-params?reportId=27" | jq '.parameters[0].type'   # "select"
# Atteso: type="date"
curl -s "http://localhost:5678/webhook/get-params?reportId=49" | jq '.parameters[].type'    # "text"... (49 è String con %)
curl -s "http://localhost:5678/webhook/get-params?reportId=12" | jq '.parameters[].type'    # "date","date"
# Atteso: type="number" (se ne trovi uno con Integer)
curl -s "http://localhost:5678/webhook/get-params?reportId=21" | jq '.parameters'           # []
```

## Bug #2 — Phantom params per i report senza parametri

### Sintomo
**26 report** restituiscono `parameters` con un elemento spurio:
```json
{
  "report_id": 21,
  "parameters": [ { "options": null } ],
  "output_options": [...]
}
```
invece del corretto:
```json
{
  "report_id": 21,
  "parameters": [],
  "output_options": [...]
}
```

Report affetti: 4, 5, 21, 25, 26, 33, 36, 41, 44, 51, 53, 57, 58, 59, 64, 65, 66, 67, 68,
69, 72, 74, 75, 77, 78, 79.

Il frontend conta `params.length === 1` invece di `0` e tenta di renderizzare un input
senza `name`/`label`/`type` → label vuota, input testuale grigio non funzionante.

### Causa
Catena di nodi in `Get_Report_Parameters`:

1. **`Get Reports by ID`** (Postgres):
   ```sql
   SELECT * FROM public.pe_parameter WHERE report_id = $1::INT
   ```
   con `alwaysOutputData: true`. Per i report senza parametri restituisce 0 righe ma
   n8n emette comunque 1 item vuoto (`{}`).
2. **`Loop Over Items`** itera su quell'unico item vuoto.
3. **`If`** controlla `subquery_id` non empty → l'item vuoto va al ramo "false" → **`Set:
   Options`** (raw mode `{"options": null}` con `includeOtherFields:true`).
4. **`Merge`** + **`Code: Format Parameters`** legge `$('Loop Over Items').all()` e map-pa
   l'item vuoto in un oggetto `{ name: undefined, ..., options: null }` → output JSON
   serializza solo `options: null` (le proprietà undefined vengono droppate) → da qui il
   phantom `{"options": null}`.

`alwaysOutputData: true` su `Get Reports by ID` è necessario al funzionamento attuale del
workflow: senza di esso, per i report a zero parametri, il flusso si fermerebbe e
`Code: Format Parameters` non riceverebbe input → nessuna risposta.

### Fix proposto
**Opzione A (raccomandata, minima invasività):** filtrare gli item privi di
`parameter_name` direttamente in `Code: Format Parameters`.

```js
const allParams = $('Loop Over Items').all();

const paramsList = allParams
  .map(p => p.json)
  .filter(p => p && typeof p.parameter_name === "string" && p.parameter_name.length > 0)  // ← NEW
  .sort((a, b) => (a.parameter_order || 0) - (b.parameter_order || 0));

// ... resto invariato ...
```

Effetto: per i 26 report senza parametri, `paramsList` resta `[]` e l'output diventa
correttamente `parameters: []`.

**Opzione B (più strutturata, scartata):** aggiungere un nodo `IF: Has Params` subito
dopo `Get Reports by ID` con condizione `parameter_name notEmpty`, ramo "false" che
salta direttamente a `Code: Format Final Response` con `parameters: []`. Più rumorosa
sul grafo del workflow per zero benefici aggiuntivi.

### Test post-fix
```bash
# Atteso: parameters == []
curl -s "http://localhost:5678/webhook/get-params?reportId=21" | jq '.parameters | length'   # 0
curl -s "http://localhost:5678/webhook/get-params?reportId=44" | jq '.parameters | length'   # 0
curl -s "http://localhost:5678/webhook/get-params?reportId=4"  | jq '.parameters | length'   # 0
# Regressione: parameters intatto su report con params
curl -s "http://localhost:5678/webhook/get-params?reportId=49" | jq '.parameters | length'   # 2
curl -s "http://localhost:5678/webhook/get-params?reportId=27" | jq '.parameters | length'   # 2
```

## Procedura di applicazione

1. Aprire n8n: http://10.1.1.11:5678 → Workflow `Get_Report_Parameters`.
2. Editare il nodo **`Code: Format Parameters`** sostituendo il `jsCode` come da
   snippet sotto (combina entrambi i fix in un'unica modifica, un solo nodo toccato).
3. Salvare e attivare. Nessun deploy frontend necessario in parallelo.
4. Eseguire i test post-fix di entrambe le sezioni (12 curl in totale).
5. Sanity check sul frontend: aprire `?page=reportistica`, selezionare:
   - Report 21 (no params) → la card "Parametri" deve mostrare il messaggio
     "Nessun parametro configurato per questo report" e la tabella deve auto-eseguire.
   - Report 27 (select) → il dropdown "Legami" deve mostrare i 24 valori.
   - Report 12 (date) → due input `type="date"` con calendar picker.

### Snippet finale di `Code: Format Parameters`

```js
const allParams = $('Loop Over Items').all();

const normalizeType = (rawType, hasOptions) => {
  const t = (rawType || "").trim().toLowerCase();
  if (t === "date") return "date";
  if (t === "integer" || t === "int" || t === "number") return "number";
  if (t === "string") return hasOptions ? "select" : "text";
  if (t === "object") return "text";
  return "text";
};

const paramsList = allParams
  .map(p => p.json)
  .filter(p => p && typeof p.parameter_name === "string" && p.parameter_name.length > 0)
  .sort((a, b) => (a.parameter_order || 0) - (b.parameter_order || 0));

const parameters = paramsList.map(p => {
  const opts = p.options || null;
  const hasOptions = Array.isArray(opts) && opts.length > 0;
  return {
    name: p.parameter_name,
    label: p.parameter_label,
    type: normalizeType(p.parameter_type, hasOptions),
    required: !!p.is_required,
    default: p.default_value,
    order: p.parameter_order,
    options: opts,
  };
});

return [{ json: { parameters } }];
```

## Impatto frontend (post-applicazione fix n8n)

Una volta applicati i fix in n8n:
- **`renderParam`** in `app/pages/ReportisticaPage.tsx` inizierà finalmente a colpire i
  case `"select"`, `"date"`, `"number"` per i parametri appropriati. Nessuna modifica al
  frontend richiesta — il codice è già pronto, era solo affamato di tipi corretti.
- Il check `params.length === 0` per il messaggio "Nessun parametro configurato" smetterà
  di essere bypassato per i 26 report affetti.
- Il filter `opt.value !== null` aggiunto recentemente in `ReportisticaPage.tsx` resta
  utile come safety net (alcune options `Rilevanza` del report 3 hanno `value: null`).

## Out of scope

- Tipo `Object`: aprire task separato per investigare il singolo caso e capire se è dato
  errato o se serve un nuovo widget.
- Eventuale migrazione del DB `pe_parameter.parameter_type` ai valori canonici lowercase:
  più pulito a regime ma richiede coordinamento con altri consumatori che leggono dalla
  tabella. Per ora ci limitiamo alla normalizzazione in workflow.
