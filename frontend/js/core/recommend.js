/* Moteur de reco : filmsDB + mapping + reponses (globals). */

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
