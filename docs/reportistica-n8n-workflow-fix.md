# Reportistica — Changelog del fix (n8n workflow `lsBDQEySkQqOu7tn`)

**Data:** 2026-04-24
**Stato finale:** ✅ webhook funzionante end-to-end — `Norme da Tradurre` (reportId=49) restituisce 24.639 righe con 12 colonne.
**Nessun file modificato in `/opt/athena`** — tutte le modifiche sono esclusivamente lato n8n.

## Fix finali applicati (oltre al piano iniziale)

In ordine di scoperta durante il rollout:

1. **`Respond to Webhook`** — connessione mancante da `Build Error Response` → aggiunta.
2. **Header response** — deduplicato in un singolo `Content-Type: application/json; charset=utf-8`.
3. **`Get Report Definition` — query sbagliata**: `FROM pe_reports` → **`FROM public.pe_report`** (singolare, con schema).
4. **`Get Report Definition` — credenziali sbagliate**: la credential "Postgres account" puntava a un DB senza le tabelle di config. Cambiata con quella usata dai workflow `Get_Report_Name` / `Get_Report_Parameters`.
5. **`If Report Found`** — abilitato "Convert types where required" (il campo `id` è numerico, non stringa).
6. **`Replace Placeholders`** — campo SQL rinominato: `report.query` → `report.main_query`.
7. **`DatabaseType` switch** — due bug correlati:
   - `{{ $json.databasetype }}` → `{{ $json.database_type }}` (underscore)
   - `"postgres"` / `"sqlserver"` → `"Postgres"` / `"SqlServer"` (capitalizzati come nel DB)

## Verifica finale (post-fix)

| Caso | Request | Response |
|---|---|---|
| Param mancante | `{"reportId":49,"params":{}}` | `success:false, error:"PARAMETRI MANCANTI: p_otc"` |
| Report inesistente | `{"reportId":99999,"params":{}}` | `success:false, error:"Report non trovato: reportId=99999"` |
| Esecuzione OK | `{"reportId":49,"params":{"p_otc":"-1","p_fte":"%"}}` | `success:true, rowCount:24639, columns:[12], data:[...]` |

Tutti HTTP 200, Content-Type `application/json; charset=utf-8`.

## Micro-bug residuo (non bloccante)

Nel codice di `Replace Placeholders`, `missingParams` contiene duplicati quando un placeholder compare più volte nella query (es. `["p_otc","p_otc"]`). Dedup opzionale:

```js
const missing = [...new Set(foundPlaceholders.filter(p => params[p] === undefined || params[p] === null))];
```

## Stato di partenza (baseline catturata)

Chiamata `POST http://10.1.1.11:5678/webhook/execute` con body `{"reportId":1,"params":{},"output":"json"}` →
```
HTTP 500
{"message":"Error in workflow"}
```
Stesso risultato con `reportId` valido, non valido, e con/senza parametri. Il webhook è **inutilizzabile** da Athena.

Cause diagnosticate leggendo il workflow via `mcp__n8n-mcp__get_workflow_details`:

1. Nodo **`Merge`** con un solo input collegato → output non deterministico.
2. Nodo **`Code in JavaScript`** lancia `throw new Error(...)` per parametri mancanti → n8n risponde HTTP 500 non JSON.
3. Switch **`DatabaseType`** / **`Server`** senza `fallbackOutput` → dead-end silenzioso.
4. `Webhook.responseMode = "lastNode"` → dipende dal branch attivato; fragile.
5. `Execute a SQL query` senza gestione `onError` → un errore SQL fa crollare l'intero flusso.
6. `Execute a SQL query` con `alwaysOutputData: true` emette `{}` su zero risultati → il client riceve `data:[{}]` invece di `data:[]`.

## Modifiche applicate nel workflow patchato

File generato: `/home/simone.mezzabotta/.claude/plans/reportistica-workflow-fixed.json`
(fuori da `/opt/athena`, pronto per essere importato in n8n)

### Nodi rimossi
- **`Merge`** — inutile, sostituito da collegamento diretto.
- **`Code in JavaScript1`** (originale wrapper `{data: ...}`) — sostituito da `Build JSON Response`.
- **Convert to HTML/CSV/XLSX/PDF** e lo Switch esteso per output non-JSON — **tagliati per ora** (fuori scope, erano già rotti: `binaryPropertyName` errato e riferimento al nodo disabilitato `ReportDefinition`). Il nuovo `Output Switch` mantiene solo il ramo JSON e un fallback che comunque risponde in JSON.
- **`ReportDefinition`** (DataTable già `disabled`) — rimosso, non serve.

### Nodi modificati
| Nodo | Modifica |
|---|---|
| `Webhook` | `responseMode: lastNode` → `responseMode: responseNode` |
| `Get Report Definition` | aggiunto `alwaysOutputData: true` per gestire reportId inesistente senza errore |
| `Replace Placeholders` (ex `Code in JavaScript`) | `throw` rimpiazzato da `return [{ json: { __error, error, missingParams } }]` |
| `DatabaseType` | aggiunto `fallbackOutput: "extra"` (3° output "Unsupported") |
| `Server` | aggiunto `fallbackOutput: "extra"` (2° output "UnknownServer") |
| `Execute a SQL query` | aggiunto `onError: "continueErrorOutput"` per catturare errori SQL e instradarli al Build Error Response |

### Nodi aggiunti
| Nodo | Tipo | Ruolo |
|---|---|---|
| `IF Report Found` | `if` | Splitta il flusso se `Get Report Definition` non ha trovato il reportId |
| `IF Missing Params` | `if` | Intercetta il flag `__error` dal Replace Placeholders |
| `Tag: Report Not Found` | `code` | Tagga payload con `__source:"report-not-found"` |
| `Tag: Unsupported DB` | `code` | Tagga payload `__source:"unsupported-database-type"` |
| `Tag: Unknown Server` | `code` | Tagga payload `__source:"unknown-server"` |
| `Tag: SQL Error` | `code` | Tagga payload `__source:"sql-error"` |
| `Build JSON Response` | `code` | Produce l'enveloppe di successo `{success, reportId, reportName, columns, rowCount, data, executedAt, error:null}` filtrando la riga vuota da `alwaysOutputData` |
| `Build Error Response` | `code` | Produce lo stesso schema con `success:false` e `error` popolato |
| `Respond to Webhook` | `respondToWebhook` | Unico terminale. `Content-Type: application/json`, HTTP 200 sempre |

### Topologia finale
```
Webhook
  └─► Get Report Definition ──► IF Report Found
         (not found)──► Tag: Report Not Found ──┐
         (found)─────► Replace Placeholders ──► IF Missing Params
                                                 (missing)────────────────────┤
                                                 (ok)─────► DatabaseType
                                                              (postgres/sqlsrv)─► Server
                                                                                    (cetus)──► Execute a SQL query
                                                                                                  (ok)────► Output Switch ──► Build JSON Response ───┐
                                                                                                  (error)─► Tag: SQL Error ──────────────────────────┤
                                                                                    (other)──► Tag: Unknown Server ──────────────────────────────────┤
                                                              (other)────► Tag: Unsupported DB ───────────────────────────────────────────────────────┤
                                                                                                                                                      ▼
                                                                                                                                     Build Error Response
                                                                                                                                               │
                                                                                                                                               ▼
                                                                                                                                     Respond to Webhook
```

## Come applicare le modifiche

### Opzione A — Import del workflow patchato (consigliata)

1. In n8n UI → **Workflows** → ⋯ → **Import from File**
2. Selezionare `/home/simone.mezzabotta/.claude/plans/reportistica-workflow-fixed.json`
3. Il workflow verrà importato come **`Reportistica (fixed)`** (inattivo, nome diverso per non sovrascrivere)
4. **Ri-bindare le credenziali** sui due nodi Postgres (`Get Report Definition`, `Execute a SQL query`) — il JSON non contiene credenziali per sicurezza
5. Fare un test run con body di esempio (vedi sezione Verifica)
6. Quando confermato, sul workflow originale: **disattivare** → sul nuovo: rinominare in `Reportistica` → **attivare** (oppure copiare le modifiche nell'originale a mano)

### Opzione B — Modifica manuale sul workflow esistente

Applicare in ordine nell'editor del workflow `Reportistica` (id `lsBDQEySkQqOu7tn`):

1. Eliminare il nodo `Merge` e i nodi `Convert to HTML/CSV/XLSX/File` (rotti)
2. Webhook → `Response` → settare `Respond` su **"Using 'Respond to Webhook' node"**
3. `Code in JavaScript` → sostituire il codice con il corrispondente da `Replace Placeholders` nel JSON patchato
4. Aggiungere nodo **`IF`** dopo `Code in JavaScript` che testa `{{ $json.__error === true }}` (true → Build Error Response, false → DatabaseType)
5. `DatabaseType` → aprire **Options → Fallback Output → "Extra Output"**, rinominare `Unsupported`
6. `Server` → idem con `UnknownServer`
7. `Execute a SQL query` → **Settings → On Error → "Continue (using error output)"**
8. Aggiungere il nodo `Build JSON Response` (Code) con il codice dal JSON
9. Aggiungere il nodo `Build Error Response` (Code) con il codice dal JSON
10. Aggiungere il nodo `Respond to Webhook` (`Respond With: JSON`, `Response Body: {{ $json }}`, `Response Code: 200`)
11. Collegare come da topologia sopra

## Contratto di risposta garantito

Sempre HTTP 200, sempre `application/json`, sempre questo schema:

Successo:
```json
{
  "success": true,
  "reportId": 12,
  "reportName": "FTE per unità",
  "columns": ["col1", "col2"],
  "rowCount": 2,
  "data": [ {"col1":"v","col2":"v"}, ... ],
  "executedAt": "2026-04-24T10:00:00Z",
  "error": null
}
```

Errore (stesso schema, `success:false`):
```json
{
  "success": false,
  "reportId": 12,
  "reportName": "...",
  "columns": [],
  "rowCount": 0,
  "data": [],
  "executedAt": "2026-04-24T10:00:00Z",
  "error": "PARAMETRI MANCANTI: p_from, p_to",
  "missingParams": ["p_from", "p_to"]
}
```

## Verifica

Dopo aver applicato le modifiche:

```bash
# 1. Report valido senza parametri obbligatori (atteso: success:false con missingParams)
curl -sS -X POST http://10.1.1.11:5678/webhook/execute \
  -H 'Content-Type: application/json' \
  -d '{"reportId":1,"params":{},"output":"json"}' | jq

# 2. ReportId inesistente (atteso: success:false, error "Report non trovato: reportId=9999")
curl -sS -X POST http://10.1.1.11:5678/webhook/execute \
  -H 'Content-Type: application/json' \
  -d '{"reportId":9999,"params":{},"output":"json"}' | jq

# 3. Report valido con tutti i parametri (atteso: success:true, data popolato)
#    Usare un reportId che non ha placeholder o passare tutti i parametri attesi.
curl -sS -X POST http://10.1.1.11:5678/webhook/execute \
  -H 'Content-Type: application/json' \
  -d '{"reportId":71,"params":{},"output":"json"}' | jq

# 4. Via proxy Athena (dev server acceso su :3090)
curl -sS -X POST http://localhost:3090/n8n/webhook/execute \
  -H 'Content-Type: application/json' \
  -d '{"reportId":71,"params":{},"output":"json"}' | jq
```

Criteri di accettazione:
- ogni chiamata ritorna HTTP 200
- `Content-Type: application/json`
- il body ha sempre i campi `success, reportId, reportName, columns, rowCount, data, executedAt, error`
- nessuna risposta `{"message":"Error in workflow"}`

## Note operative

- Il file JSON non contiene le credenziali Postgres (intenzionale — vanno ri-bindate nell'editor).
- Il workflow patchato è `active: false` di default; attivarlo solo dopo aver verificato i tre test sopra.
- Tenere archiviato il workflow originale (`Reportistica`, id `lsBDQEySkQqOu7tn`) come rollback, oppure esportarne una copia prima di sovrascrivere.

## Fuori scope (follow-up tracciati)

- Reintrodurre i rami `html`, `csv`, `xlsx`, `pdf` in modo corretto (oggi `binaryPropertyName` è valorizzato con un oggetto invece che un nome di proprietà; inoltre riferiscono il nodo disabilitato `ReportDefinition`).
- Integrare ag-grid in `/opt/athena/reportistica/app/pages/ReportisticaPage.tsx` per consumare il nuovo contratto e renderizzare `columns` + `data` in tabella.
