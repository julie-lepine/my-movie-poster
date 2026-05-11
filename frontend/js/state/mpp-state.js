/* État quiz / sélection films — global entre scripts classiques (sans bundler). */
var reponses = {};
var currentFilms = [];
var currentQuestionIndex = 0;

/** Loupe ×100 : activée seulement après clic sur « Zoom ». */
var posterMagnifierEnabled = false;
