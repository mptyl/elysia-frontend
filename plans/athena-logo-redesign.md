# Athena Logo Redesign Plan (v2)

Questo piano descrive il rifacimento del logo del progetto Athena, integrando l'estetica istituzionale di **UNI.com** con un'anima tecnologica moderna (AI/RAG), supportando nativamente sia il **Tema Chiaro** che il **Tema Scuro**.

## Strategia di Design

1.  **Uniformità Tipografica**: Abbandono dell'enfasi sulla "a" finale per un font sans-serif geometrico e uniforme, garantendo massima leggibilità e autorità.
2.  **Dualismo Cromatico**:
    *   **Light Mode**: Uso del Blu Navy UNI (#26547B) come colore primario su sfondi bianchi/neutri.
    *   **Dark Mode**: Inversione cromatica o uso di varianti "glow" (Cyan/White) per mantenere il contrasto su sfondi scuri (#171717).
3.  **Proposte Distinte**: Presentazione di due direzioni: una più istituzionale (Globe-centric) e una più tecnologica (Connection-centric).

## Proposte di Concept

### Proposta 1: "Geometric Institutional"
*   **Icona**: Globo UNI stilizzato con punti di giunzione neurali.
*   **Mood**: Formale, stabile, integrato.

### Proposta 2: "Modern Tech RAG"
*   **Icona**: Una 'A' integrata in una struttura circolare dinamica che simboleggia il flusso di dati (Retrieval).
*   **Mood**: Innovativo, veloce, premium SaaS.

## Modifiche Tecniche

### [Branding & Assets]

#### [NEW] [logo_light.svg](file:///Users/mp/AthenaAI/elysia-frontend/public/logo_light.svg)
Logo ottimizzato per il tema chiaro (Blu UNI su Bianco).

#### [NEW] [logo_dark.svg](file:///Users/mp/AthenaAI/elysia-frontend/public/logo_dark.svg)
Logo ottimizzato per il tema scuro (Bianco/Cyan su Sfondo Scuro).

#### [MODIFY] [branding.ts](file:///Users/mp/AthenaAI/elysia-frontend/app/config/branding.ts)
Implementazione di logica dinamica per caricare `logo_light.svg` o `logo_dark.svg` in base al tema di sistema/app.

#### [MODIFY] [layout.tsx] / [page.tsx]
Aggiornamento dei componenti globali per riflettere la nuova identità cromatica UNI.

## Piano di Verifica

### Manual Verification
- **Audit Visivo**: Verifica della resa su `http://10.1.1.11:3090` effettuando il toggle del sistema operativo tra Light e Dark mode.
- **Uniformità**: Controllo che il font sia consistente in ogni istanza del logo.
