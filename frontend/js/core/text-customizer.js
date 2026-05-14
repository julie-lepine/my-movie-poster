// Shared title/subtitle customizer for classic browser scripts.
(function () {
  const FORMAT_KEYS = ["bold", "italic", "strike"];
  const EMPTY_FORMAT = {
    bold: false,
    italic: false,
    strike: false,
  };

  function cloneFormat(format = EMPTY_FORMAT) {
    return FORMAT_KEYS.reduce((copy, key) => {
      copy[key] = Boolean(format[key]);
      return copy;
    }, {});
  }

  function createState(defaults) {
    return {
      title: defaults.title || "",
      subtitle: defaults.subtitle || "",
      titleFont: defaults.titleFont || "",
      subtitleFont: defaults.subtitleFont || "",
      titleSize: Number(defaults.titleSize) || 0,
      subtitleSize: Number(defaults.subtitleSize) || 0,
      titleColor: defaults.titleColor || "",
      subtitleColor: defaults.subtitleColor || "",
      filmTitleColor: defaults.filmTitleColor || "",
      filmYearColor: defaults.filmYearColor || "",
      filmCircleSrc: defaults.filmCircleSrc || "",
      backgroundImage: defaults.backgroundImage || "",
      titleFormat: cloneFormat(defaults.titleFormat),
      subtitleFormat: cloneFormat(defaults.subtitleFormat),
    };
  }

  function cloneState(state) {
    return {
      ...state,
      titleFormat: cloneFormat(state.titleFormat),
      subtitleFormat: cloneFormat(state.subtitleFormat),
    };
  }

  function getChangedKeys(previous, next) {
    const keys = [
      "title",
      "subtitle",
      "titleFont",
      "subtitleFont",
      "titleSize",
      "subtitleSize",
      "titleColor",
      "subtitleColor",
      "filmTitleColor",
      "filmYearColor",
      "filmCircleSrc",
      "backgroundImage",
    ];
    const changed = keys.filter((key) => previous[key] !== next[key]);

    FORMAT_KEYS.forEach((key) => {
      if (previous.titleFormat[key] !== next.titleFormat[key]) {
        changed.push("titleFormat");
      }
      if (previous.subtitleFormat[key] !== next.subtitleFormat[key]) {
        changed.push("subtitleFormat");
      }
    });

    return [...new Set(changed)];
  }

  function resolveElement(ref) {
    if (!ref) return null;
    if (typeof ref === "function") return ref();
    if (typeof ref === "string") {
      return document.getElementById(ref) || document.querySelector(ref);
    }
    return ref;
  }

  function readControl(ref, fallback = "") {
    const el = resolveElement(ref);
    return el ? el.value : fallback;
  }

  function writeControl(ref, value) {
    const el = resolveElement(ref);
    if (el) el.value = value;
  }

  function setFormatClasses(el, format) {
    el.classList.toggle("is-editor-bold", format.bold);
    el.classList.toggle("is-editor-italic", format.italic);
    el.classList.toggle("is-editor-strike", format.strike);
  }

  function setInlineTextStyle(el, state, scope, options) {
    const format = scope === "title" ? state.titleFormat : state.subtitleFormat;
    const decorations = [];
    if (format.strike) decorations.push("line-through");

    el.style.fontFamily = state[`${scope}Font`];
    el.style.color = state[`${scope}Color`];
    el.style.fontSize = `${state[`${scope}Size`]}px`;
    el.style.fontWeight = format.bold
      ? options[`${scope}BoldWeight`] || "900"
      : options[`${scope}NormalWeight`] || "700";
    el.style.fontStyle = format.italic ? "italic" : "normal";
    el.style.textDecoration = decorations.join(" ") || "none";
  }

  function setBackgroundImage(el, imageUrl) {
    if (!el) return;
    if (imageUrl) {
      el.style.backgroundImage = `url("${imageUrl}")`;
    } else {
      el.style.removeProperty("background-image");
    }
  }

  function createTextCustomizer(config) {
    const defaults = config.defaults || {};
    const controls = config.controls || {};
    const targets = config.targets || {};
    const state = createState(defaults);

    function syncLabels() {
      const titleLabel = resolveElement(controls.titleSizeLabel);
      const subtitleLabel = resolveElement(controls.subtitleSizeLabel);
      if (titleLabel) titleLabel.textContent = String(state.titleSize);
      if (subtitleLabel) subtitleLabel.textContent = String(state.subtitleSize);
    }

    function getFormatButton(scope, key) {
      return resolveElement(controls.formatButtons?.[scope]?.[key]);
    }

    function syncToolbar() {
      FORMAT_KEYS.forEach((key) => {
        const titleButton = getFormatButton("title", key);
        if (titleButton) {
          titleButton.classList.toggle("is-active", state.titleFormat[key]);
          titleButton.setAttribute("aria-pressed", String(state.titleFormat[key]));
        }

        const subtitleButton = getFormatButton("subtitle", key);
        if (subtitleButton) {
          subtitleButton.classList.toggle("is-active", state.subtitleFormat[key]);
          subtitleButton.setAttribute("aria-pressed", String(state.subtitleFormat[key]));
        }
      });
    }

    function writeControls() {
      writeControl(controls.titleInput, state.title);
      writeControl(controls.subtitleInput, state.subtitle);
      writeControl(controls.titleFontSelect, state.titleFont);
      writeControl(controls.subtitleFontSelect, state.subtitleFont);
      writeControl(controls.titleSizeInput, String(state.titleSize));
      writeControl(controls.subtitleSizeInput, String(state.subtitleSize));
      writeControl(controls.titleColorInput, state.titleColor);
      writeControl(controls.subtitleColorInput, state.subtitleColor);
      writeControl(controls.filmTitleColorInput, state.filmTitleColor);
      writeControl(controls.filmYearColorInput, state.filmYearColor);
      writeControl(controls.filmCircleSelect, state.filmCircleSrc);
      writeControl(controls.backgroundSelect, state.backgroundImage);
      const backgroundUpload = resolveElement(controls.backgroundUpload);
      if (backgroundUpload) backgroundUpload.value = "";
      syncLabels();
      syncToolbar();
    }

    function readControls() {
      state.title = readControl(controls.titleInput, state.title);
      state.subtitle = readControl(controls.subtitleInput, state.subtitle);
      state.titleFont = readControl(controls.titleFontSelect, state.titleFont);
      state.subtitleFont = readControl(controls.subtitleFontSelect, state.subtitleFont);
      state.titleColor = readControl(controls.titleColorInput, state.titleColor);
      state.subtitleColor = readControl(controls.subtitleColorInput, state.subtitleColor);
      state.filmTitleColor = readControl(controls.filmTitleColorInput, state.filmTitleColor);
      state.filmYearColor = readControl(controls.filmYearColorInput, state.filmYearColor);
      state.filmCircleSrc = readControl(controls.filmCircleSelect, state.filmCircleSrc);
      state.titleSize =
        Number(readControl(controls.titleSizeInput, state.titleSize)) || defaults.titleSize || 0;
      state.subtitleSize =
        Number(readControl(controls.subtitleSizeInput, state.subtitleSize)) ||
        defaults.subtitleSize ||
        0;
      const backgroundSelect = resolveElement(controls.backgroundSelect);
      if (backgroundSelect) state.backgroundImage = backgroundSelect.value;
      syncLabels();
    }

    function apply(changedKeys) {
      const title = resolveElement(targets.title);
      const subtitle = resolveElement(targets.subtitle);
      const root = resolveElement(targets.root);
      const background = resolveElement(targets.background || targets.root);
      const changed = new Set(changedKeys || []);
      const shouldApplyAll = !changedKeys;

      if (title) {
        title.textContent = state.title.trim() || defaults.title || "";
      }
      if (subtitle) {
        subtitle.textContent = state.subtitle.trim() || defaults.subtitle || "";
      }

      if (targets.mode === "cssVars" && root) {
        if (state.titleFont) root.style.setProperty("--poster-title-font", state.titleFont);
        if (state.subtitleFont) {
          root.style.setProperty("--poster-subtitle-font", state.subtitleFont);
        }
        if (state.titleColor) root.style.setProperty("--poster-title-color", state.titleColor);
        if (state.subtitleColor) {
          root.style.setProperty("--poster-subtitle-color", state.subtitleColor);
        }
        if (state.filmTitleColor) {
          root.style.setProperty("--poster-film-title-color", state.filmTitleColor);
        }
        if (state.filmYearColor) {
          root.style.setProperty("--poster-film-year-color", state.filmYearColor);
        }
        if (state.titleSize > 0) {
          root.style.setProperty("--poster-title-font-size", `${state.titleSize}px`);
        } else {
          root.style.removeProperty("--poster-title-font-size");
        }
        if (state.subtitleSize > 0) {
          root.style.setProperty("--poster-subtitle-font-size", `${state.subtitleSize}px`);
        } else {
          root.style.removeProperty("--poster-subtitle-font-size");
        }
        if (title) setFormatClasses(title, state.titleFormat);
        if (subtitle) setFormatClasses(subtitle, state.subtitleFormat);
        if ((shouldApplyAll || changed.has("filmCircleSrc")) && state.filmCircleSrc) {
          root.querySelectorAll(".film-circle").forEach((circle) => {
            circle.src = state.filmCircleSrc;
          });
        }
      }

      if (targets.mode === "inline") {
        if (title) setInlineTextStyle(title, state, "title", targets);
        if (subtitle) setInlineTextStyle(subtitle, state, "subtitle", targets);
      }

      setBackgroundImage(background, state.backgroundImage);
    }

    function notifyChange(changedKeys) {
      if (typeof config.onChange === "function") {
        config.onChange(api, { changedKeys: changedKeys || [] });
      }
    }

    function updateFromControls() {
      const previous = cloneState(state);
      readControls();
      const changedKeys = getChangedKeys(previous, state);
      if (!changedKeys.length) return;
      apply(changedKeys);
      notifyChange(changedKeys);
    }

    function reset() {
      const previous = cloneState(state);
      Object.assign(state, createState(defaults));
      writeControls();
      const changedKeys = getChangedKeys(previous, state);
      apply(changedKeys);
      notifyChange(changedKeys);
    }

    function readUploadedBackground(file) {
      if (!file || !file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        state.backgroundImage = String(reader.result || "");
        const backgroundSelect = resolveElement(controls.backgroundSelect);
        if (backgroundSelect) backgroundSelect.value = "";
        apply(["backgroundImage"]);
        notifyChange(["backgroundImage"]);
      });
      reader.readAsDataURL(file);
    }

    function bind() {
      [
        controls.titleInput,
        controls.subtitleInput,
        controls.titleFontSelect,
        controls.subtitleFontSelect,
        controls.titleColorInput,
        controls.subtitleColorInput,
        controls.filmTitleColorInput,
        controls.filmYearColorInput,
        controls.filmCircleSelect,
        controls.titleSizeInput,
        controls.subtitleSizeInput,
        controls.backgroundSelect,
      ].forEach((ref) => {
        const el = resolveElement(ref);
        if (!el) return;
        el.addEventListener("input", updateFromControls);
        el.addEventListener("change", updateFromControls);
      });

      const backgroundUpload = resolveElement(controls.backgroundUpload);
      if (backgroundUpload) {
        backgroundUpload.addEventListener("change", () => {
          readUploadedBackground(backgroundUpload.files?.[0]);
        });
      }

      FORMAT_KEYS.forEach((key) => {
        const titleButton = getFormatButton("title", key);
        if (titleButton) {
          titleButton.addEventListener("click", () => {
            state.titleFormat[key] = !state.titleFormat[key];
            syncToolbar();
            apply(["titleFormat"]);
            notifyChange(["titleFormat"]);
          });
        }

        const subtitleButton = getFormatButton("subtitle", key);
        if (subtitleButton) {
          subtitleButton.addEventListener("click", () => {
            state.subtitleFormat[key] = !state.subtitleFormat[key];
            syncToolbar();
            apply(["subtitleFormat"]);
            notifyChange(["subtitleFormat"]);
          });
        }
      });

      const resetButton = resolveElement(controls.resetButton);
      if (resetButton) resetButton.addEventListener("click", reset);
    }

    const api = {
      apply,
      bind,
      getState: () => cloneState(state),
      reset,
      syncLabels,
      syncToolbar,
      updateFromControls,
      writeControls,
    };

    return api;
  }

  window.MppTextCustomizer = {
    create: createTextCustomizer,
    formatKeys: FORMAT_KEYS,
  };
})();
