# Avviare il Dev Server (`npm run dev:server`)

Il comando `npm run dev:server` avvia il frontend Next.js sulla porta **3090**, in ascolto su `0.0.0.0` (accessibile da tutta la rete locale).

Questo documento spiega tre modi per tenerlo in esecuzione: a mano, con `nohup`, e con `tmux`.

---

## 1. Lancio manuale (foreground)

```bash
cd /opt/athena/elysia-frontend
npm run dev:server
```

Il processo resta agganciato al terminale corrente. Se chiudi il terminale o premi `Ctrl+C`, il server si ferma.

**Quando usarlo:** durante lo sviluppo attivo, quando vuoi vedere i log in tempo reale.

**Come fermarlo:** `Ctrl+C` nel terminale.

---

## 2. Lancio con `nohup` (background)

### Cos'è `nohup`

Quando chiudi un terminale (o una connessione SSH), il sistema operativo invia il segnale **SIGHUP** (Signal Hang Up) a tutti i processi figli di quel terminale. Per default, i processi che ricevono SIGHUP terminano.

`nohup` (= **no hang up**) fa due cose:

1. **Ignora il segnale SIGHUP**, quindi il processo sopravvive alla chiusura del terminale.
2. **Redirige stdout e stderr** su un file (`nohup.out` per default), dato che il terminale non sarà più disponibile per mostrare l'output.

### Avviare

```bash
cd /opt/athena/elysia-frontend
nohup npm run dev:server > dev-server.log 2>&1 &
```

Spiegazione dei pezzi:

| Parte | Significato |
|---|---|
| `nohup` | Protegge il processo dalla chiusura del terminale |
| `npm run dev:server` | Il comando da eseguire |
| `> dev-server.log` | Redirige stdout nel file `dev-server.log` |
| `2>&1` | Redirige anche stderr nello stesso file |
| `&` | Manda il processo in background |

La shell stamperà qualcosa come:

```
[1] 12345
```

Dove `12345` è il **PID** (Process ID). Annotalo, ti servirà per fermarlo.

### Consultare i log

```bash
# Ultimi 50 righe
tail -50 /opt/athena/elysia-frontend/dev-server.log

# Seguire i log in tempo reale (Ctrl+C per uscire dal tail, il server NON si ferma)
tail -f /opt/athena/elysia-frontend/dev-server.log
```

### Fermare il processo

**Metodo 1 — se conosci il PID:**

```bash
kill 12345
```

**Metodo 2 — trovare il PID dalla porta:**

```bash
ss -tlnp | grep 3090
# Output esempio: users:(("next-server",pid=12345,fd=22))

kill 12345
```

**Metodo 3 — trovare il PID dal nome del processo:**

```bash
pgrep -f "next dev"
# Stampa il PID

kill $(pgrep -f "next dev")
```

**Metodo 4 — kill forzato (se `kill` non basta):**

```bash
kill -9 12345
```

> `kill` invia SIGTERM (terminazione pulita). `kill -9` invia SIGKILL (terminazione immediata, il processo non può ignorarlo). Usa `-9` solo se il processo non risponde al `kill` normale.

### Verifica che il processo sia effettivamente morto

```bash
ss -tlnp | grep 3090
```

Se non stampa nulla, la porta è libera.

---

## 3. Lancio con `tmux` (sessione persistente)

### Cos'è `tmux`

`tmux` (Terminal MUltiplexer) crea sessioni di terminale virtuali che continuano a vivere anche quando ti disconnetti. A differenza di `nohup`, puoi **rientrare nella sessione** e vedere l'output in tempo reale, come se non ti fossi mai disconnesso.

### Avviare

```bash
# Crea una sessione chiamata "frontend"
tmux new-session -d -s frontend "cd /opt/athena/elysia-frontend && npm run dev:server"
```

### Vedere i log (entrare nella sessione)

```bash
tmux attach -t frontend
```

Sei ora dentro la sessione tmux. Vedi l'output del server in tempo reale.

**Per uscire dalla sessione senza fermare il server:** premi `Ctrl+B`, poi `D` (detach).

### Fermare il processo

**Dall'interno della sessione tmux:**

1. `tmux attach -t frontend`
2. `Ctrl+C` (ferma il server)
3. `exit` (chiude la sessione tmux)

**Dall'esterno:**

```bash
tmux kill-session -t frontend
```

### Comandi tmux utili

| Comando | Significato |
|---|---|
| `tmux ls` | Lista le sessioni attive |
| `tmux attach -t frontend` | Entra nella sessione |
| `Ctrl+B, D` | Esci dalla sessione senza fermarla |
| `tmux kill-session -t frontend` | Distrugge la sessione (e il processo) |

## 4. Esecuzione da Build (Minor consumo di memoria)

Se il `dev:server` consuma troppa memoria e non hai bisogno dell'Ricaricamento Rapido (HMR) per lo sviluppo attivo, puoi compilare prima l'applicazione ed eseguirla in modalità produzione. Questo riduce significativamente l'impronta di memoria.

1. **Compila l'applicazione:**
   ```bash
   cd /opt/athena/elysia-frontend
   npm run build
   ```

2. **Avvia la build salvata (ascolterà sempre su 0.0.0.0 e porta 3090):**
   ```bash
   npm run start:server
   ```

Puoi combinare questa modalità con `nohup` o `tmux` (ad esempio `nohup npm run start:server > prod.log 2>&1 &`).

---

## Riepilogo

| Metodo | Sopravvive alla chiusura del terminale | Puoi vedere i log live | Come fermarlo |
|---|---|---|---|
| Manuale | No | Si | `Ctrl+C` |
| `nohup` | Si | Solo con `tail -f` | `kill <PID>` |
| `tmux` | Si | Si (attach alla sessione) | `Ctrl+C` nella sessione, oppure `tmux kill-session` |

### Consiglio pratico

- **Sviluppo locale attivo** → lancio manuale
- **Server in background su una macchina remota** → `tmux` (più comodo per debug)
- **Avvio automatico / script** → `nohup` (più semplice da scriptare)
