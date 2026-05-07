// =====================
// STATE
// =====================
let reponses = {};
let currentFilms = [];
let currentQuestionIndex = 0;

const DEFAULT_TITLE = "Ton univers cinéma";
const DEFAULT_SUBTITLE = "Création personnalisée";

const quizData = [
  {
    id: "palette",
    question: "Si ta vie avait une palette de couleurs, ce serait plutôt :",
    options: [
      { value: "cyberpunk", label: "Néons froids" },
      { value: "vintage", label: "Tons chauds vintage" },
      { value: "dark", label: "Noir et blanc" },
      { value: "dreamy", label: "Couleurs pastel" },
      { value: "energetic", label: "Couleurs saturées" },
    ],
  },
  {
    id: "ambiance",
    question: "Quelle ambiance te correspond le plus ?",
    options: [
      { value: "nostalgic", label: "Mélancolique" },
      { value: "rebellious", label: "Chaotique" },
      { value: "dreamy", label: "Romantique" },
      { value: "mysterious", label: "Mystérieuse" },
      { value: "energetic", label: "Ã‰nergique" },
    ],
  },
  {
    id: "persona",
    question: "Choisis un mot qui te définit le mieux :",
    options: [
      { value: "dreamy", label: "Rêveur" },
      { value: "epic", label: "Ambitieux" },
      { value: "dark", label: "Solitaire" },
      { value: "rebellious", label: "Rebelle" },
      { value: "peaceful", label: "Calme" },
      { value: "energetic", label: "Intense" },
    ],
  },
  {
    id: "soundtrack",
    question: "Quelle musique imaginaire accompagnerait ton poster ?",
    options: [
      { value: "cyberpunk", label: "Synthwave" },
      { value: "vintage", label: "Jazz" },
      { value: "dreamy", label: "Lo-fi" },
      { value: "rebellious", label: "Rock brut" },
      { value: "epic", label: "Orchestral" },
      { value: "dark", label: "Silence pesant" },
    ],
  },
  {
    id: "emotion",
    question: "Quelle émotion veux-tu ressentir en regardant ton poster ?",
    options: [
      { value: "epic", label: "Motivation" },
      { value: "nostalgic", label: "Nostalgie" },
      { value: "mysterious", label: "Mystère" },
      { value: "peaceful", label: "Apaisement" },
      { value: "energetic", label: "Adrénaline" },
      { value: "dark", label: "Solitude" },
    ],
  },
  {
    id: "world",
    question: "Tu préfères les univers :",
    options: [
      { value: "minimalist", label: "Minimalistes" },
      { value: "surreal", label: "Surréalistes" },
      { value: "detailed", label: "Détaillés" },
      { value: "urban", label: "Réalistes" },
      { value: "vintage", label: "Rétro" },
      { value: "futuristic", label: "Modernes" },
    ],
  },
];

const optionImages = {
  palette: {
    cyberpunk: "./assets/quiz/palette-cyberpunk.jpg",
    vintage: "./assets/quiz/palette-vintage.jpg",
    dark: "./assets/quiz/palette-dark.jpg",
    dreamy: "./assets/quiz/palette-dreamy.jpg",
    energetic: "./assets/quiz/palette-energetic.jpg",
  },
  ambiance: {
    nostalgic: "./assets/quiz/ambiance-nostalgic.jpg",
    rebellious: "./assets/quiz/ambiance-rebellious.jpg",
    dreamy: "./assets/quiz/ambiance-dreamy.jpg",
    mysterious: "./assets/quiz/ambiance-mysterious.jpg",
    energetic: "./assets/quiz/ambiance-energetic.jpg",
  },
  persona: {
    dreamy: "./assets/quiz/persona-dreamy.jpg",
    epic: "./assets/quiz/persona-epic.jpg",
    dark: "./assets/quiz/persona-dark.jpg",
    rebellious: "./assets/quiz/persona-rebellious.jpg",
    peaceful: "./assets/quiz/persona-peaceful.jpg",
    energetic: "./assets/quiz/persona-energetic.jpg",
  },
  soundtrack: {
    cyberpunk: "./assets/quiz/soundtrack-cyberpunk.jpg",
    vintage: "./assets/quiz/soundtrack-vintage.jpg",
    dreamy: "./assets/quiz/soundtrack-dreamy.jpg",
    rebellious: "./assets/quiz/soundtrack-rebellious.jpg",
    epic: "./assets/quiz/soundtrack-epic.jpg",
    dark: "./assets/quiz/soundtrack-dark.jpg",
  },
  emotion: {
    epic: "./assets/quiz/emotion-epic.jpg",
    nostalgic: "./assets/quiz/emotion-nostalgic.jpg",
    mysterious: "./assets/quiz/emotion-mysterious.jpg",
    peaceful: "./assets/quiz/emotion-peaceful.jpg",
    energetic: "./assets/quiz/emotion-energetic.jpg",
    dark: "./assets/quiz/emotion-dark.jpg",
  },
  world: {
    minimalist: "./assets/quiz/world-minimalist.jpg",
    surreal: "./assets/quiz/world-surreal.jpg",
    detailed: "./assets/quiz/world-detailed.jpg",
    urban: "./assets/quiz/world-urban.jpg",
    vintage: "./assets/quiz/world-vintage.jpg",
    futuristic: "./assets/quiz/world-futuristic.jpg",
  },
};

// =====================
// DOM
// =====================
const progress = document.querySelector(".progress");
const quiz = document.getElementById("quiz");
const questionStep = document.getElementById("questionStep");
const questionTitle = document.getElementById("questionTitle");
const answersGrid = document.getElementById("answersGrid");
const prevQuestionBtn = document.getElementById("prevQuestionBtn");
const restartQuizBtn = document.getElementById("restartQuizBtn");

const results = document.getElementById("resultats");
const poster = document.getElementById("posterContainer");
const posterWorkspace = document.getElementById("posterWorkspace");
const downloadBtn = document.getElementById("downloadPoster");
const shareBtn = document.getElementById("sharePoster");
const loading = document.getElementById("loadingScreen");
const titleEditorInput = document.getElementById("titleEditorInput");
const subtitleEditorInput = document.getElementById("subtitleEditorInput");
const resetPosterTextBtn = document.getElementById("resetPosterText");
const posterCountSelect = document.getElementById("posterCountSelect");

// =====================
// DB FILMS
// =====================
const filmsDB = [
  {
    titre: "12 hommes en colère",
    image: "./assets/img/12 hommes en colère.jpg",
    tags: ["aventure", "introspection", "drame", "melancolie"],
  },
  {
    titre: "3 Billboards, Les panneaux de la vengeance",
    image: "./assets/img/3 Billboards, Les panneaux de la vengeance.jpg",
    tags: ["nature", "soleil", "psychologique", "imaginaire"],
  },
  {
    titre: "American Beauty",
    image: "./assets/img/American Beauty.jpg",
    tags: ["emotion", "dynamique", "aventure", "introspection"],
  },
  {
    titre: "Annie Hall",
    image: "./assets/img/Annie Hall.jpg",
    tags: ["imaginaire", "renouveau", "amour", "emotion"],
  },
  {
    titre: "Arrête-moi si tu peux",
    image: "./assets/img/Arrête-moi si tu peux.jpg",
    tags: ["emotion", "dynamique", "aventure", "introspection"],
  },
  {
    titre: "Astérix et Obélix   Mission Cléopâtre",
    image: "./assets/img/Astérix et Obélix _ Mission Cléopâtre.jpg",
    tags: ["emotion", "dynamique", "aventure", "introspection"],
  },
  {
    titre: "Bienvenue à Gattaca",
    image: "./assets/img/Bienvenue à Gattaca.jpg",
    tags: ["sombre", "nature", "soleil", "psychologique"],
  },
  {
    titre: "Big Fish",
    image: "./assets/img/Big Fish.jpg",
    tags: ["imaginaire", "renouveau", "amour", "emotion"],
  },
  {
    titre: "Billy Elliot",
    image: "./assets/img/Billy Elliot.jpg",
    tags: ["aventure", "introspection", "drame", "melancolie"],
  },
  {
    titre: "Casino Royale",
    image: "./assets/img/Casino Royale.jpg",
    tags: ["melancolie", "sombre", "nature", "soleil"],
  },
  {
    titre: "Chantons sous la Pluie",
    image: "./assets/img/Chantons sous la Pluie.jpg",
    tags: ["emotion", "dynamique", "aventure", "introspection"],
  },
  {
    titre: "Cloud Atlas",
    image: "./assets/img/Cloud Atlas.jpg",
    tags: ["melancolie", "sombre", "nature", "soleil"],
  },
  {
    titre: "Coup de Foudre à Notting Hill",
    image: "./assets/img/Coup de Foudre à Notting Hill.jpg",
    tags: ["emotion", "dynamique", "aventure", "introspection"],
  },
  {
    titre: "des hommes d honneur",
    image: "./assets/img/des hommes d_honneur.jpg",
    tags: ["amour", "emotion", "dynamique", "aventure"],
  },
  {
    titre: "Diamants sur Canapé",
    image: "./assets/img/Diamants sur Canapé.jpg",
    tags: ["drame", "melancolie", "sombre", "nature"],
  },
  {
    titre: "Drive",
    image: "./assets/img/Drive.jpg",
    tags: ["sombre", "nature", "soleil", "psychologique"],
  },
  {
    titre: "eternal sunshine of the spotless mind",
    image: "./assets/img/eternal sunshine of the spotless mind.jpg",
    tags: ["psychologique", "imaginaire", "renouveau", "amour"],
  },
  {
    titre: "Fight Club",
    image: "./assets/img/Fight Club.jpg",
    tags: ["dynamique", "aventure", "introspection", "drame"],
  },
  {
    titre: "Forrest Gump",
    image: "./assets/img/Forrest Gump.jpg",
    tags: ["sombre", "nature", "soleil", "psychologique"],
  },
  {
    titre: "Full Metal Jacket",
    image: "./assets/img/Full Metal Jacket.jpg",
    tags: ["aventure", "introspection", "drame", "melancolie"],
  },
  {
    titre: "Gone Girl",
    image: "./assets/img/Gone Girl.jpg",
    tags: ["amour", "emotion", "dynamique", "aventure"],
  },
  {
    titre: "Good Bye, Lenin !",
    image: "./assets/img/Good Bye, Lenin !.jpg",
    tags: ["amour", "emotion", "dynamique", "aventure"],
  },
  {
    titre: "Gran Torino",
    image: "./assets/img/Gran Torino.jpg",
    tags: ["drame", "melancolie", "sombre", "nature"],
  },
  {
    titre: "Happiness Therapy",
    image: "./assets/img/Happiness Therapy.jpg",
    tags: ["renouveau", "amour", "emotion", "dynamique"],
  },
  {
    titre: "Il était temps",
    image: "./assets/img/Il était temps.jpg",
    tags: ["melancolie", "sombre", "nature", "soleil"],
  },
  {
    titre: "Il faut sauver le soldat Ryan",
    image: "./assets/img/Il faut sauver le soldat Ryan.jpg",
    tags: ["dynamique", "aventure", "introspection", "drame"],
  },
  {
    titre: "Imitation Game",
    image: "./assets/img/Imitation Game.jpg",
    tags: ["aventure", "introspection", "drame", "melancolie"],
  },
  {
    titre: "Incendies",
    image: "./assets/img/Incendies.jpg",
    tags: ["amour", "emotion", "dynamique", "aventure"],
  },
  {
    titre: "Inception(1)",
    image: "./assets/img/Inception(1).jpg",
    tags: ["renouveau", "amour", "emotion", "dynamique"],
  },
  {
    titre: "Inception",
    image: "./assets/img/Inception.jpg",
    tags: ["renouveau", "amour", "emotion", "dynamique"],
  },
  {
    titre: "Je vais bien, ne t’en fais pas",
    image: "./assets/img/Je vais bien, ne t’en fais pas.jpg",
    tags: ["emotion", "dynamique", "aventure", "introspection"],
  },
  {
    titre: "Joyeux Noël",
    image: "./assets/img/Joyeux Noël.jpg",
    tags: ["sombre", "nature", "soleil", "psychologique"],
  },
  {
    titre: "Jumanji (1995)",
    image: "./assets/img/Jumanji (1995).jpg",
    tags: ["emotion", "dynamique", "aventure", "introspection"],
  },
  {
    titre: "kick ass",
    image: "./assets/img/kick ass.jpg",
    tags: ["dynamique", "aventure", "introspection", "drame"],
  },
  {
    titre: "L arnacoeur",
    image: "./assets/img/L_arnacoeur.jpg",
    tags: ["nature", "soleil", "psychologique", "imaginaire"],
  },
  {
    titre: "L Odyssée de P",
    image: "./assets/img/L_Odyssée de P.jpg",
    tags: ["amour", "emotion", "dynamique", "aventure"],
  },
  {
    titre: "L’Illusionniste",
    image: "./assets/img/L’Illusionniste.jpg",
    tags: ["nature", "soleil", "psychologique", "imaginaire"],
  },
  {
    titre: "L’Imaginarium du Docteur Parnassus",
    image: "./assets/img/L’Imaginarium du Docteur Parnassus.jpg",
    tags: ["amour", "emotion", "dynamique", "aventure"],
  },
  {
    titre: "La Classe américaine",
    image: "./assets/img/La Classe américaine.jpg",
    tags: ["psychologique", "imaginaire", "renouveau", "amour"],
  },
  {
    titre: "La Grande Vadrouille",
    image: "./assets/img/La Grande Vadrouille.jpg",
    tags: ["soleil", "psychologique", "imaginaire", "renouveau"],
  },
  {
    titre: "La La Land",
    image: "./assets/img/La La Land.jpg",
    tags: ["aventure", "introspection", "drame", "melancolie"],
  },
  {
    titre: "La ligne verte",
    image: "./assets/img/La ligne verte.jpg",
    tags: ["renouveau", "amour", "emotion", "dynamique"],
  },
  {
    titre: "La Liste de Schindler",
    image: "./assets/img/La Liste de Schindler.jpg",
    tags: ["melancolie", "sombre", "nature", "soleil"],
  },
  {
    titre: "La Mélodie du bonheur",
    image: "./assets/img/La Mélodie du bonheur.jpg",
    tags: ["melancolie", "sombre", "nature", "soleil"],
  },
  {
    titre: "La Rose Pourpre du Caire",
    image: "./assets/img/La Rose Pourpre du Caire.jpg",
    tags: ["nature", "soleil", "psychologique", "imaginaire"],
  },
  {
    titre: "La Vie est Belle (1946)",
    image: "./assets/img/La Vie est Belle (1946).jpg",
    tags: ["sombre", "nature", "soleil", "psychologique"],
  },
  {
    titre: "La Vie est Belle (1997)",
    image: "./assets/img/La Vie est Belle (1997).jpg",
    tags: ["soleil", "psychologique", "imaginaire", "renouveau"],
  },
  {
    titre: "La Vie rêvée de Walter Mitty",
    image: "./assets/img/La Vie rêvée de Walter Mitty.jpg",
    tags: ["nature", "soleil", "psychologique", "imaginaire"],
  },
  {
    titre: "Le Cercle des poètes disparus",
    image: "./assets/img/Le Cercle des poètes disparus.jpg",
    tags: ["aventure", "introspection", "drame", "melancolie"],
  },
  {
    titre: "Le Château de ma Mère",
    image: "./assets/img/Le Château de ma Mère.jpg",
    tags: ["dynamique", "aventure", "introspection", "drame"],
  },
  {
    titre: "Le Dîner de cons",
    image: "./assets/img/Le Dîner de cons.jpg",
    tags: ["drame", "melancolie", "sombre", "nature"],
  },
  {
    titre: "Le Discours d un roi",
    image: "./assets/img/Le Discours d_un roi.jpg",
    tags: ["sombre", "nature", "soleil", "psychologique"],
  },
  {
    titre: "Le Fabuleux Destin d Amélie Poulain",
    image: "./assets/img/Le Fabuleux Destin d_Amélie Poulain.jpg",
    tags: ["renouveau", "amour", "emotion", "dynamique"],
  },
  {
    titre: "Le Fugitif",
    image: "./assets/img/Le Fugitif.jpg",
    tags: ["amour", "emotion", "dynamique", "aventure"],
  },
  {
    titre: "Le Monde de Charlie",
    image: "./assets/img/Le Monde de Charlie.jpg",
    tags: ["soleil", "psychologique", "imaginaire", "renouveau"],
  },
  {
    titre: "Le Prénom",
    image: "./assets/img/Le Prénom.jpg",
    tags: ["amour", "emotion", "dynamique", "aventure"],
  },
  {
    titre: "Le Prestige",
    image: "./assets/img/Le Prestige.jpg",
    tags: ["amour", "emotion", "dynamique", "aventure"],
  },
  {
    titre: "Léon",
    image: "./assets/img/Léon.jpg",
    tags: ["dynamique", "aventure", "introspection", "drame"],
  },
  {
    titre: "Les bronzés font du sk",
    image: "./assets/img/Les bronzés font du sk.jpg",
    tags: ["amour", "emotion", "dynamique", "aventure"],
  },
  {
    titre: "Les Enfants du Marais",
    image: "./assets/img/Les Enfants du Marais.jpg",
    tags: ["soleil", "psychologique", "imaginaire", "renouveau"],
  },
  {
    titre: "Les Évadés",
    image: "./assets/img/Les Évadés.jpg",
    tags: ["soleil", "psychologique", "imaginaire", "renouveau"],
  },
  {
    titre: "Les Fils de l homme",
    image: "./assets/img/Les Fils de l_homme.jpg",
    tags: ["dynamique", "aventure", "introspection", "drame"],
  },
  {
    titre: "Les Poupées Russes",
    image: "./assets/img/Les Poupées Russes.jpg",
    tags: ["imaginaire", "renouveau", "amour", "emotion"],
  },
  {
    titre: "Lord of War",
    image: "./assets/img/Lord of War.jpg",
    tags: ["renouveau", "amour", "emotion", "dynamique"],
  },
  {
    titre: "Lost in Translation",
    image: "./assets/img/Lost in Translation.jpg",
    tags: ["soleil", "psychologique", "imaginaire", "renouveau"],
  },
  {
    titre: "Love Actually",
    image: "./assets/img/Love Actually.jpg",
    tags: ["psychologique", "imaginaire", "renouveau", "amour"],
  },
  {
    titre: "Match Point",
    image: "./assets/img/Match Point.jpg",
    tags: ["emotion", "dynamique", "aventure", "introspection"],
  },
  {
    titre: "Matrix",
    image: "./assets/img/Matrix.jpg",
    tags: ["soleil", "psychologique", "imaginaire", "renouveau"],
  },
  {
    titre: "Melancholia",
    image: "./assets/img/Melancholia.jpg",
    tags: ["sombre", "nature", "soleil", "psychologique"],
  },
  {
    titre: "Mélodie en sous-sol",
    image: "./assets/img/Mélodie en sous-sol.jpg",
    tags: ["dynamique", "aventure", "introspection", "drame"],
  },
  {
    titre: "Memento",
    image: "./assets/img/Memento.jpg",
    tags: ["dynamique", "aventure", "introspection", "drame"],
  },
  {
    titre: "Minority Report",
    image: "./assets/img/Minority Report.jpg",
    tags: ["drame", "melancolie", "sombre", "nature"],
  },
  {
    titre: "Minuit à Paris",
    image: "./assets/img/Minuit à Paris.jpg",
    tags: ["sombre", "nature", "soleil", "psychologique"],
  },
  {
    titre: "Mommy",
    image: "./assets/img/Mommy.jpg",
    tags: ["emotion", "dynamique", "aventure", "introspection"],
  },
  {
    titre: "Monty Python   Sacré Graal !",
    image: "./assets/img/Monty Python _ Sacré Graal !.jpg",
    tags: ["drame", "melancolie", "sombre", "nature"],
  },
  {
    titre: "Mr. Nobody",
    image: "./assets/img/Mr. Nobody.jpg",
    tags: ["amour", "emotion", "dynamique", "aventure"],
  },
  {
    titre: "Mustang",
    image: "./assets/img/Mustang.jpg",
    tags: ["emotion", "dynamique", "aventure", "introspection"],
  },
  {
    titre: "Neverland",
    image: "./assets/img/Neverland.jpg",
    tags: ["amour", "emotion", "dynamique", "aventure"],
  },
  {
    titre: "Orgueil et Préjugés",
    image: "./assets/img/Orgueil et Préjugés.jpg",
    tags: ["introspection", "drame", "melancolie", "sombre"],
  },
  {
    titre: "OSS 117   Le Caire, nid d espions",
    image: "./assets/img/OSS 117 _ Le Caire, nid d_espions.jpg",
    tags: ["psychologique", "imaginaire", "renouveau", "amour"],
  },
  {
    titre: "Premier Contact",
    image: "./assets/img/Premier Contact.jpg",
    tags: ["introspection", "drame", "melancolie", "sombre"],
  },
  {
    titre: "Pulp Fiction",
    image: "./assets/img/Pulp Fiction.jpg",
    tags: ["psychologique", "imaginaire", "renouveau", "amour"],
  },
  {
    titre: "Rain Man",
    image: "./assets/img/Rain Man.jpg",
    tags: ["psychologique", "imaginaire", "renouveau", "amour"],
  },
  {
    titre: "Requiem for a Dream",
    image: "./assets/img/Requiem for a Dream.jpg",
    tags: ["psychologique", "imaginaire", "renouveau", "amour"],
  },
  {
    titre: "Sam, je suis Sam",
    image: "./assets/img/Sam, je suis Sam.jpg",
    tags: ["sombre", "nature", "soleil", "psychologique"],
  },
  {
    titre: "sherlock holmes (2009)",
    image: "./assets/img/sherlock holmes (2009).jpg",
    tags: ["melancolie", "sombre", "nature", "soleil"],
  },
  {
    titre: "shutter island",
    image: "./assets/img/shutter island.jpg",
    tags: ["emotion", "dynamique", "aventure", "introspection"],
  },
  {
    titre: "Sixième Sens",
    image: "./assets/img/Sixième Sens.jpg",
    tags: ["melancolie", "sombre", "nature", "soleil"],
  },
  {
    titre: "Slumdog Millionaire",
    image: "./assets/img/Slumdog Millionaire.jpg",
    tags: ["drame", "melancolie", "sombre", "nature"],
  },
  {
    titre: "Snatch, tu braques ou tu raques",
    image: "./assets/img/Snatch, tu braques ou tu raques.jpg",
    tags: ["emotion", "dynamique", "aventure", "introspection"],
  },
  {
    titre: "The Ghost Writer",
    image: "./assets/img/The Ghost Writer.jpg",
    tags: ["sombre", "nature", "soleil", "psychologique"],
  },
  {
    titre: "The Grand Budapest Hotel",
    image: "./assets/img/The Grand Budapest Hotel.jpg",
    tags: ["sombre", "nature", "soleil", "psychologique"],
  },
  {
    titre: "The social network",
    image: "./assets/img/The social network.jpg",
    tags: ["imaginaire", "renouveau", "amour", "emotion"],
  },
  {
    titre: "The Truman Show",
    image: "./assets/img/The Truman Show.jpg",
    tags: ["dynamique", "aventure", "introspection", "drame"],
  },
  {
    titre: "Un Air de Famille",
    image: "./assets/img/Un Air de Famille.jpg",
    tags: ["soleil", "psychologique", "imaginaire", "renouveau"],
  },
  {
    titre: "Virgin Suicides",
    image: "./assets/img/Virgin Suicides.jpg",
    tags: ["imaginaire", "renouveau", "amour", "emotion"],
  },
  {
    titre: "Vol au-dessus d’un Nid de Coucou",
    image: "./assets/img/Vol au-dessus d’un Nid de Coucou.jpg",
    tags: ["aventure", "introspection", "drame", "melancolie"],
  },
  {
    titre: "Watchmen   Les Gardiens",
    image: "./assets/img/Watchmen _ Les Gardiens.jpg",
    tags: ["nature", "soleil", "psychologique", "imaginaire"],
  },
  {
    titre: "Will Hunting",
    image: "./assets/img/Will Hunting.jpg",
    tags: ["introspection", "drame", "melancolie", "sombre"],
  },
  {
    titre: "Wiplash",
    image: "./assets/img/Wiplash.jpg",
    tags: ["aventure", "introspection", "drame", "melancolie"],
  },
];

// =====================
// MAPPING
// =====================
const mapping = {
  palette: {
    cyberpunk: ["psychologique", "sombre", "dynamique"],
    vintage: ["amour", "soleil", "emotion"],
    dark: ["sombre", "drame", "introspection"],
    dreamy: ["imaginaire", "melancolie", "emotion"],
    energetic: ["dynamique", "aventure", "soleil"],
  },
  ambiance: {
    nostalgic: ["melancolie", "emotion", "introspection"],
    rebellious: ["dynamique", "sombre", "psychologique"],
    dreamy: ["imaginaire", "amour", "emotion"],
    mysterious: ["psychologique", "introspection", "sombre"],
    energetic: ["dynamique", "aventure", "soleil"],
  },
  persona: {
    dreamy: ["imaginaire", "emotion", "melancolie"],
    epic: ["dynamique", "aventure", "drame"],
    dark: ["sombre", "psychologique", "introspection"],
    rebellious: ["dynamique", "sombre", "drame"],
    surreal: ["imaginaire", "psychologique", "nature"],
    peaceful: ["nature", "introspection", "emotion"],
    energetic: ["dynamique", "soleil", "aventure"],
  },
  soundtrack: {
    cyberpunk: ["psychologique", "dynamique", "sombre"],
    vintage: ["emotion", "amour", "soleil"],
    dreamy: ["melancolie", "imaginaire", "introspection"],
    rebellious: ["dynamique", "sombre", "drame"],
    epic: ["drame", "aventure", "dynamique"],
    dark: ["introspection", "sombre", "psychologique"],
  },
  emotion: {
    epic: ["dynamique", "aventure", "drame"],
    nostalgic: ["melancolie", "emotion", "amour"],
    mysterious: ["psychologique", "sombre", "introspection"],
    peaceful: ["nature", "introspection", "emotion"],
    energetic: ["dynamique", "soleil", "aventure"],
    dark: ["sombre", "drame", "introspection"],
  },
  world: {
    minimalist: ["introspection", "nature", "emotion"],
    surreal: ["imaginaire", "psychologique", "melancolie"],
    detailed: ["drame", "emotion", "psychologique"],
    urban: ["drame", "psychologique", "dynamique"],
    vintage: ["amour", "emotion", "soleil"],
    futuristic: ["imaginaire", "dynamique", "aventure"],
  },
};

function runMappingSanityCheck() {
  const issues = [];

  quizData.forEach((question) => {
    const mappedQuestion = mapping[question.id];
    if (!mappedQuestion) {
      issues.push(`Question sans mapping: "${question.id}"`);
      return;
    }

    question.options.forEach((option) => {
      const tags = mappedQuestion[option.value];
      if (!Array.isArray(tags) || tags.length === 0) {
        issues.push(
          `Option non mappée: "${question.id}.${option.value}" (label: "${option.label}")`
        );
      }
    });

    Object.keys(mappedQuestion).forEach((mappedValue) => {
      const existsInQuiz = question.options.some((opt) => opt.value === mappedValue);
      if (!existsInQuiz) {
        issues.push(`Clé mapping orpheline: "${question.id}.${mappedValue}"`);
      }
    });
  });

  if (issues.length > 0) {
    console.warn("[Mapping sanity check] Problèmes détectés:");
    issues.forEach((issue) => console.warn(`- ${issue}`));
  } else {
    console.info("[Mapping sanity check] OK");
  }
}

// =====================
// INIT UI STATE
// =====================
function initUI() {
  runMappingSanityCheck();
  posterWorkspace.style.display = "none";
  downloadBtn.style.display = "none";
  shareBtn.style.display = "none";
  results.style.display = "none";
  renderCurrentQuestion(false);
  updateProgress();
}

initUI();

// =====================
// QUIZ FLOW
// =====================
function renderCurrentQuestion(withFade = true) {
  const quizCard = document.getElementById("quizCard");
  const render = () => {
    const current = quizData[currentQuestionIndex];
    const selected = reponses[current.id];

    questionStep.textContent = `Étape ${currentQuestionIndex + 1} / ${quizData.length}`;
    questionTitle.textContent = current.question;
    answersGrid.innerHTML = "";

    current.options.forEach((option) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer-card";
      const optionImage = getOptionImage(current.id, option.value);

      const media = document.createElement("div");
      media.className = "answer-media";

      if (optionImage) {
        const img = document.createElement("img");
        img.src = optionImage;
        img.alt = option.label;
        img.loading = "lazy";
        media.appendChild(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "answer-media-placeholder";
        placeholder.textContent = "Image";
        media.appendChild(placeholder);
      }

      const label = document.createElement("span");
      label.className = "answer-label";
      label.textContent = option.label;

      btn.appendChild(media);
      btn.appendChild(label);

      if (selected === option.value) {
        btn.classList.add("selected");
      }
      btn.addEventListener("click", () => handleAnswerSelect(option.value));
      answersGrid.appendChild(btn);
    });

    prevQuestionBtn.disabled = currentQuestionIndex === 0;
  };

  if (!withFade) {
    render();
    return;
  }

  quizCard.classList.add("is-fading");
  setTimeout(() => {
    render();
    quizCard.classList.remove("is-fading");
  }, 140);
}

function getOptionImage(questionId, optionValue) {
  return optionImages[questionId]?.[optionValue] || "";
}

function handleAnswerSelect(value) {
  const current = quizData[currentQuestionIndex];
  reponses[current.id] = value;

  for (let i = currentQuestionIndex + 1; i < quizData.length; i++) {
    delete reponses[quizData[i].id];
  }

  const tags = buildTagsFromAnswers();
  recommend(tags);
  updateProgress();

  if (Object.keys(reponses).length === quizData.length) {
    runFinal();
    return;
  }

  currentQuestionIndex++;
  renderCurrentQuestion(true);
}

function updateProgress() {
  progress.style.width = `${(Object.keys(reponses).length / quizData.length) * 100}%`;
}

prevQuestionBtn.addEventListener("click", () => {
  if (currentQuestionIndex === 0) return;
  currentQuestionIndex--;
  renderCurrentQuestion(true);
});

restartQuizBtn.addEventListener("click", () => {
  reponses = {};
  currentFilms = [];
  currentQuestionIndex = 0;
  updateProgress();
  renderCurrentQuestion(true);
});

// =====================
// RECO ENGINE
// =====================
function recommend(tags) {
  const scored = filmsDB.map((f) => {
    let score = 0;

    f.tags.forEach((t) => {
      if (tags.includes(t)) score++;
    });

    return { ...f, score };
  });

  const targetCount = Math.min(100, filmsDB.length);
  const correlatedPool = scored.filter((film) => film.score > 0);
  const selected = pickWeightedUnique(correlatedPool, targetCount);

  // Fallback: complète avec des films aléatoires si le pool corrélé est insuffisant
  if (selected.length < targetCount) {
    const remaining = scored.filter(
      (film) => !selected.some((chosen) => chosen.image === film.image)
    );
    shuffleInPlace(remaining);
    selected.push(...remaining.slice(0, targetCount - selected.length));
  }

  currentFilms = selected.slice(0, targetCount);
}

function pickWeightedUnique(pool, maxCount) {
  const available = [...pool];
  const picked = [];

  while (available.length > 0 && picked.length < maxCount) {
    const totalWeight = available.reduce(
      (sum, film) => sum + Math.max(1, film.score),
      0
    );
    let roll = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < available.length; i++) {
      roll -= Math.max(1, available[i].score);
      if (roll <= 0) {
        selectedIndex = i;
        break;
      }
    }

    picked.push(available[selectedIndex]);
    available.splice(selectedIndex, 1);
  }

  return picked;
}

function shuffleInPlace(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

function buildTagsFromAnswers() {
  let tags = [];
  Object.entries(reponses).forEach(([questionId, value]) => {
    tags = tags.concat(mapping[questionId]?.[value] || []);
  });
  return [...new Set(tags)];
}

// =====================
// LIVE PREVIEW
// =====================
function renderResults(films) {
  results.innerHTML = "";

  films.forEach((f) => {
    const div = document.createElement("div");
    div.className = "film-card";

    div.innerHTML = `
      <img src="${f.image}">
      <div class="film-title-preview">${f.titre}</div>
    `;

    results.appendChild(div);
  });
}

// =====================
// FINAL FLOW
// =====================
function runFinal() {
  showLoading();

  setTimeout(() => {
    hideLoading();

    // hide quiz + results
    quiz.style.display = "none";
    results.style.display = "none";

    // show poster container + editor panel
    posterWorkspace.style.display = "flex";
    poster.style.display = "grid";
    downloadBtn.style.display = "inline-block";
    shareBtn.style.display = "inline-block";

    generatePoster(currentFilms);

    // REVEAL ANIMATION
    revealPoster();
  }, 1200);
}

// =====================
// POSTER GENERATION
// =====================

function generatePoster(films) {

  const poster = document.getElementById("posterContainer");
  const grid = document.getElementById("posterGrid");
  const requestedCount = Number(posterCountSelect?.value || 100);
  const allowedCounts = [25, 48, 100];
  const safeCount = allowedCounts.includes(requestedCount) ? requestedCount : 100;
  const layoutByCount = {
    25: { cols: 5, gap: 8 },
    48: { cols: 8, gap: 7 },
    100: { cols: 10, gap: 6 },
  };
  const currentLayout = layoutByCount[safeCount] || layoutByCount[100];
  const cols = currentLayout.cols;
  const rows = Math.ceil(safeCount / cols);

  // reset grid
  grid.innerHTML = "";
  grid.style.setProperty("--poster-cols", String(cols));
  grid.style.setProperty("--poster-rows", String(rows));
  grid.style.setProperty("--poster-gap", `${currentLayout.gap}px`);

  // reset header si besoin (évite doublons)
  const oldHeader = poster.querySelector(".poster-header");
  if (oldHeader) oldHeader.remove();

  // HEADER
  const header = document.createElement("div");
  header.className = "poster-header";

  const title = document.createElement("div");
  title.className = "poster-title";
  title.id = "posterTitle";
  title.textContent = titleEditorInput.value.trim() || DEFAULT_TITLE;

  const subtitle = document.createElement("div");
  subtitle.className = "poster-subtitle";
  subtitle.id = "posterSubtitle";
  subtitle.textContent = subtitleEditorInput.value.trim() || DEFAULT_SUBTITLE;

  header.appendChild(title);
  header.appendChild(subtitle);

  poster.insertBefore(header, grid);

  // FILMS
  films.slice(0, safeCount).forEach((f, i) => {

    const card = document.createElement("div");
    card.className = "poster-film";

    card.style.opacity = "0";
    card.style.transform = "scale(0.95)";
    card.style.transition = "0.5s ease";

    card.innerHTML = `
      <img src="${f.image}">
      <div class="film-title">${f.titre}</div>
    `;

    grid.appendChild(card);

    // animation reveal
    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "scale(1)";
    }, i * 28);
  });
}

// =====================
// REVEAL POSTER (NETFLIX STYLE)
// =====================
function revealPoster() {
  poster.style.opacity = "0";
  poster.style.transform = "translateY(30px) scale(0.98)";

  setTimeout(() => {
    poster.style.transition = "0.8s ease";
    poster.style.opacity = "1";
    poster.style.transform = "translateY(0) scale(1)";
  }, 100);
}

// =====================
// LOADING
// =====================
function showLoading() {
  loading.classList.remove("hidden");
}

function hideLoading() {
  loading.classList.add("hidden");
}

// =====================
// DOWNLOAD (SAFE)
// =====================
function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Conversion canvas -> blob impossible"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

downloadBtn.addEventListener("click", async () => {
  if (typeof html2canvas !== "function") {
    console.error("html2canvas indisponible : vérifie le chargement du script CDN.");
    return;
  }

  try {
    const canvas = await html2canvas(poster, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#000",
      logging: false,
      imageTimeout: 15000,
    });
    const blob = await canvasToBlob(canvas);
    downloadBlob(blob, "cinema-wrapped.png");
  } catch (primaryError) {
    console.warn("Capture standard échouée, tentative fallback...", primaryError);

    try {
      const fallbackCanvas = await html2canvas(poster, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#000",
        logging: false,
        imageTimeout: 20000,
      });
      const fallbackBlob = await canvasToBlob(fallbackCanvas);
      downloadBlob(fallbackBlob, "cinema-wrapped.png");
    } catch (fallbackError) {
      console.error("Téléchargement impossible:", fallbackError);
      alert("Impossible de télécharger le poster. Vérifie que les images sont bien accessibles, puis réessaie.");
    }
  }
});

// =====================
// SHARE (SAFE FALLBACK)
// =====================
shareBtn.addEventListener("click", async () => {
  const canvas = await html2canvas(poster, {
    scale: 3,
    useCORS: true,
  });

  const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));

  const file = new File([blob], "poster.png", { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: "Mon cinéma",
        files: [file],
      });
      return;
    } catch (e) {}
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cinema-wrapped.png";
  a.click();
});

function bindPosterEditor() {
  const renderCurrentEditorValues = () => {
    const titleNode = document.getElementById("posterTitle");
    if (titleNode) {
      titleNode.textContent = titleEditorInput.value.trim() || DEFAULT_TITLE;
    }

    const subtitleNode = document.getElementById("posterSubtitle");
    if (subtitleNode) {
      subtitleNode.textContent =
        subtitleEditorInput.value.trim() || DEFAULT_SUBTITLE;
    }
  };

  const updateTitle = () => {
    renderCurrentEditorValues();
  };

  const updateSubtitle = () => {
    renderCurrentEditorValues();
  };

  titleEditorInput.addEventListener("input", updateTitle);
  subtitleEditorInput.addEventListener("input", updateSubtitle);

  resetPosterTextBtn.addEventListener("click", () => {
    titleEditorInput.value = DEFAULT_TITLE;
    subtitleEditorInput.value = DEFAULT_SUBTITLE;
    renderCurrentEditorValues();
  });

  posterCountSelect.addEventListener("change", () => {
    if (posterWorkspace.style.display !== "none" && currentFilms.length > 0) {
      generatePoster(currentFilms);
    }
  });
}

bindPosterEditor();

