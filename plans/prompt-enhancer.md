voglio creare una nuova pagina con l'identico tema e impianto grafico della pagina dove avviene la chat. La pagina deve essere raggiungibile da un link presente nel menu laterale avente come label "Prompt enhancer" e come icona un simbolo che richiami l'idea di potenziamento o miglioramento. 

La pagina deve contenere due textarea, una con un height pari al 80% dell'height totale della pagina e uno con un height pari al 20% totale della pagina. Inserisci margini e padding adeguato per rendere bella e moderna la pagina usando lo stesso tema grafica e gli stessi componenti usati da elysia.  

lo scopo della textarea superiore è quello di contenere, inizialmente, un prompt che verrà poi inviato ad un LLM per essere migliorato. Dalla seconda iterazione in poi il contenuto della textarea superiore sarà un prompt indicante suggerimenti ed indicazioni di come ulterioremte migliorare il prompt.

L'utente potrà editare ambedue le textarea, e quindi potrà aggiungere e modificare per conto suo il testo suggerito da un llm. Potrà anche decidere di non prendere in considerazione i suggerimenti e di modificare il prompt a suo piacimento. 

L'interazione avverrà tramite quattro buttons. 

Il primo bottone "Abbandona" tornerà alla pagina di chat senza fare nulla e ripresentandola come era stata lasciata. Mettilo a sinistra del prompt inferiore.

Il secondo bottone "Migliora" invierà il contenuto della textarea inferiore come primo prompt da migliorare (quando la textarea superiore è vuota) o come suggerimento per migliorare il prompt presente nella textarea superiore. In ogni caso il risultato verrà inserito nella textarea superiore. Mettilo a destra della textarea inferiore.

Il terzo bottone "Usa" prenderà il contenuto della textarea superiore e lo userà come prompt per la chat, portando l'utente alla pagina di chat con il testo della textarea superiore inviato come prompt. Mettilo a destra del prompt superiore.

Il quarto bottone "Pulisci" pulirà la textarea superiore.  Mettilo a sinistra del prompt superiore.

Quando la textarea superiore è piena e l'utente preme il bottone "Migliora" ideve essere chiamato un llm che dovrà prima di tutto verificare che il testo inserito nella textarea inferiore sia un prompt valido e che sia effettivamente un suggerimento di modifica al testo superiore. 

Se non lo è, dovrà inserire nella textarea inferiore un prompt che indichi all'utente come che il testo è mancante o inadeguato, e come migliorare il prompt presente nella textarea superiore. 

Se il testo è un suggerimento valido,  dovrà generare e inserire nella textarea superiore il prompt migliorato sulla base delle indicazioni presenti nella textarea inferiore.

