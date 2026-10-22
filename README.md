# RedOrHen — Fotografia cosplay

Questo repository contiene il **sito portfolio di RedOrHen**, fotografo cosplay:
**<https://redorhen.github.io/redorhen/>**

## A cosa serve il sito

- **Mostrare i lavori**: le foto sono organizzate in set (un personaggio o uno shooting) e divise per evento.
  Ogni set si apre in un visualizzatore a tutto schermo con zoom, che mostra le foto in piena qualità.
- **Presentare il fotografo**: la sua storia, il suo modo di lavorare e come si svolge uno shooting,
  dal primo messaggio alla consegna delle foto ritoccate a mano.
- **Far conoscere il listino**: i pacchetti Side Quest, Main Quest e Boss Fight (foto di gruppo).
- **Ricevere richieste di shooting** dalla pagina Contatti, oltre che via email e [Instagram](https://www.instagram.com/redorhen/).
- **Aiutare il fotografo a organizzarsi**: un'area riservata, protetta da login, con il calendario degli
  appuntamenti e l'editor della galleria per aggiungere, ordinare e pubblicare i set di foto senza toccare il codice.

Lo stile unisce cinema e pixel art: titoli da locandina, cornice da cinepresa e foto che compaiono
passando da pixel grossi a immagini nitide.

## Com'è fatto

- Sito statico in HTML, CSS e JavaScript, senza framework, pubblicato con **GitHub Pages**
  a ogni aggiornamento del ramo `main`.
- Foto, set della galleria e appuntamenti su **Supabase**; modulo contatti con **Formspree**.
- Codice nella cartella [`Website portfolio/`](Website%20portfolio/).

## Documentazione

- [Documentazione completa](Website%20portfolio/docs/DOCUMENTAZIONE.md): pagine, struttura dei file,
  contenuti, area riservata, pubblicazione, problemi frequenti.
- [Attivazione di Supabase](Website%20portfolio/supabase/LEGGIMI.md): guida passo per passo.
