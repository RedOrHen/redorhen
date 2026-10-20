// =====================================================================
// RedOrHen — contenuti del sito
// Questo è l'unico file da modificare per aggiornare contatti e galleria.
// =====================================================================

// Contatti: compila questi campi. Se un campo è vuoto, il link relativo
// viene nascosto dal sito.
window.SITE = {
  email: '',        // es. 'ciao@redorhen.it'
  instagram: '',    // es. 'https://www.instagram.com/redorhen'
  formEndpoint: ''  // opzionale: URL di Formspree (o simile). Se vuoto, il modulo
                    // contatti apre il programma di posta con il messaggio già scritto.
};

// Lavori.
// Per aggiungere una foto: copiala in assets/works/ e aggiungi una voce qui.
//   src        percorso della foto
//   w, h       larghezza e altezza in pixel (servono per non far "saltare" la pagina)
//   character  nome del personaggio
//   series     serie / universo
//   category   usata per i filtri della pagina Lavori
//   cosplayer  @ del cosplayer (facoltativo)
//   featured   true = compare anche nella pellicola della Home
//   alt        descrizione della foto per chi usa lettori di schermo
// Le voci senza "src" sono segnaposto generati automaticamente: sostituiscile
// con le tue foto (o cancellale).
window.WORKS = [
  {
    src: 'assets/works/fata-girasoli.jpg', w: 470, h: 705,
    character: 'Rosetta', series: 'Disney Fairies', category: 'Disney',
    cosplayer: '', featured: true,
    alt: 'Cosplayer con lunghi capelli rossi e ali da fata trasparenti in un campo di girasoli al tramonto'
  },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Anime', featured: true, w: 800, h: 1120 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Videogiochi', featured: true, w: 800, h: 1120 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Fumetti', featured: true, w: 800, h: 1120 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Anime', featured: true, w: 800, h: 1120 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Film', featured: true, w: 800, h: 1120 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Videogiochi', w: 800, h: 1000 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Anime', w: 800, h: 1200 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Fumetti', w: 800, h: 640 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Disney', w: 800, h: 1120 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Film', w: 800, h: 1000 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Videogiochi', w: 800, h: 1200 }
];
