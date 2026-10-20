// =====================================================================
// RedOrHen — contenuti del sito
// Questo è l'unico file da modificare per aggiornare contatti e galleria.
// =====================================================================

// Contatti. Se un campo è vuoto, il link relativo viene nascosto dal sito.
window.SITE = {
  email: '',        // es. 'ciao@redorhen.it'
  instagram: 'https://www.instagram.com/redorhen/',
  formEndpoint: ''  // opzionale: URL di Formspree (o simile). Se vuoto, il modulo
                    // contatti apre il programma di posta con il messaggio già scritto.
};

// Lavori: ogni voce è un SET, cioè una "cartella" di foto.
// Nella pagina Lavori ogni set è un riquadro; cliccandolo si apre il carosello
// con tutte le sue foto. La PRIMA foto dell'elenco è la copertina del riquadro.
//
// Per aggiungere un set:
//   1. crea una cartella in assets/works/ (es. assets/works/poison-ivy/)
//   2. copiaci dentro le foto scelte (es. 01.jpg, 02.jpg, ...)
//   3. aggiungi qui una voce con l'elenco delle foto
//
//   character  nome del personaggio
//   series     serie / universo
//   category   usata per i filtri della pagina Lavori
//   cosplayer  @ del cosplayer (facoltativo)
//   featured   true = la copertina compare anche nella pellicola della Home
//   photos     elenco delle foto del set:
//                src  percorso della foto
//                w, h larghezza e altezza in pixel (servono per non far "saltare" la pagina)
//                alt  descrizione della foto (facoltativa, per chi usa lettori di schermo)
//
// I set senza "photos" sono segnaposto generati automaticamente (con "count"
// foto finte): sostituiscili con i tuoi set o cancellali.
window.WORKS = [
  {
    character: 'Rosetta', series: 'Disney Fairies', category: 'Disney',
    cosplayer: '', featured: true,
    photos: [
      {
        src: 'assets/works/fata-girasoli.jpg', w: 470, h: 705,
        alt: 'Cosplayer con lunghi capelli rossi e ali da fata trasparenti in un campo di girasoli al tramonto'
      }
      // , { src: 'assets/works/rosetta/02.jpg', w: 1600, h: 2400 }
    ]
  },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Anime', featured: true, count: 5 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Videogiochi', featured: true, count: 4 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Fumetti', featured: true, count: 6 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Anime', featured: true, count: 3 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Film', featured: true, count: 4 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Videogiochi', count: 5, w: 800, h: 1000 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Anime', count: 4, w: 800, h: 1200 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Fumetti', count: 3, w: 800, h: 640 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Disney', count: 4 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Film', count: 6, w: 800, h: 1000 },
  { character: 'Foto in arrivo', series: 'Segnaposto', category: 'Videogiochi', count: 4, w: 800, h: 1200 }
];
