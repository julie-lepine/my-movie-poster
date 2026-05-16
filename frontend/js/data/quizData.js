// Quiz configuration: questions + options + option images

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
/*{
    id: "ambiance",
    question: "Quelle ambiance te correspond le plus ?",
    options: [
      { value: "nostalgic", label: "Mélancolique" },
      { value: "rebellious", label: "Chaotique" },
      { value: "dreamy", label: "Romantique" },
      { value: "mysterious", label: "Mystérieuse" },
      { value: "energetic", label: "Énergique" },
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
  },*/
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

