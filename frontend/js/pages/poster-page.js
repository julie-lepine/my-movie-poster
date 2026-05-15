// Flux quiz -> recommandations -> poster. Chargé uniquement sur la page Mon Poster.

function quizPrefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Remonte la vue sur le bloc quiz (mobile : après une réponse en bas de grille). */
function scrollQuizIntoViewStart() {
  const el = typeof quiz !== "undefined" ? quiz : document.getElementById("quiz");
  if (!el) return;
  el.scrollIntoView({
    behavior: quizPrefersReducedMotion() ? "auto" : "smooth",
    block: "start",
    inline: "nearest",
  });
}

function focusQuizQuestionTitle() {
  if (!questionTitle) return;
  try {
    questionTitle.focus({ preventScroll: true });
  } catch {
    questionTitle.focus();
  }
}

function initPosterPage() {
  runMappingSanityCheck();
  renderCurrentQuestion(false);
  updateProgress();
}

function renderCurrentQuestion(withFade = true) {
  const quizCard = document.getElementById("quizCard");
  const render = () => {
    const current = quizData[currentQuestionIndex];
    const selected = reponses[current.id];

    questionStep.textContent = `Étape ${currentQuestionIndex + 1} / ${quizData.length}`;
    questionTitle.textContent = current.question;
    answersGrid.innerHTML = "";

    const fragment = document.createDocumentFragment();
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
        img.decoding = "async";
        protectImageElement(img);
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
      fragment.appendChild(btn);
    });
    answersGrid.appendChild(fragment);

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
    scrollQuizIntoViewStart();
    requestAnimationFrame(focusQuizQuestionTitle);
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

function runFinal() {
  showLoading();

  setTimeout(() => {
    hideLoading();

    quiz.style.display = "none";
    results.style.display = "none";
    progress.parentElement.style.display = "none";

    posterWorkspace.style.display = "flex";
    poster.style.display = "grid";

    generatePoster(currentFilms);

    revealPoster();

    setTimeout(schedulePosterLayoutMetrics, 950);
  }, 1200);
}

function revealPoster() {
  poster.style.opacity = "0";
  poster.style.transform = "translateY(30px) scale(0.98)";

  setTimeout(() => {
    poster.style.transition = "0.8s ease";
    poster.style.opacity = "1";
    poster.style.transform = "translateY(0) scale(1)";
  }, 100);
}

function showLoading() {
  loading.classList.remove("hidden");
}

function hideLoading() {
  loading.classList.add("hidden");
}

initPosterPage();
