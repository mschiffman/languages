document.addEventListener("DOMContentLoaded", function () {
  if (window.AOS) {
    AOS.init({ once: false });
  }

  const EPISODES_PER_PAGE = 6;
  const buttons = Array.from(
    document.querySelectorAll(".topic-btn[data-topic]")
  );
  const episodes = Array.from(document.querySelectorAll(".episode"));
  const episodesContainer = document.getElementById("episodes");
  const scrollTopBtn = document.getElementById("scroll-top");
  const SCROLL_THRESHOLD = 300;
  const API_ENDPOINT = "../api/social.php";

  const REACTIONS = [
    { type: "like", label: "Like", emoji: "\u{1F44D}" },
    { type: "love", label: "Love", emoji: "\u{2764}\u{FE0F}" },
    { type: "care", label: "Care", emoji: "\u{1F970}" },
    { type: "haha", label: "Haha", emoji: "\u{1F602}" },
    { type: "wow", label: "Wow", emoji: "\u{1F62E}" },
    { type: "sad", label: "Sad", emoji: "\u{1F622}" },
    { type: "angry", label: "Angry", emoji: "\u{1F620}" },
  ];
  const EPISODE_STATE = new Map();
  const supportsHover = window.matchMedia("(hover: hover)").matches;
  let activePicker = null;
  let pickerHideTimer = null;
  const numberFormatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  });
  let reactionRequestCounter = 0;

  function parseReactionCounts(raw) {
    const counts = {};
    REACTIONS.forEach((reaction) => {
      counts[reaction.type] = 0;
    });

    if (!raw) {
      return counts;
    }

    raw
      .split(/[,|]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const [key, value] = pair.split(":").map((part) => part.trim());
        if (Object.prototype.hasOwnProperty.call(counts, key)) {
          const numericValue = Number(value);
          counts[key] = Number.isFinite(numericValue) ? numericValue : 0;
        }
      });

    return counts;
  }

  function formatNumber(value) {
    return numberFormatter.format(Math.max(0, value || 0));
  }

  function formatPlural(value, noun) {
    const safeValue = Math.max(0, value || 0);
    return `${formatNumber(safeValue)} ${noun}${safeValue === 1 ? "" : "s"}`;
  }

  function cloneCounts(counts) {
    return Object.fromEntries(
      Object.entries(counts || {}).map(([key, value]) => [
        key,
        Number(value) || 0,
      ])
    );
  }

  function applyMetrics(episode, metrics) {
    if (!episode || !metrics) {
      return;
    }

    const state = EPISODE_STATE.get(episode);
    if (!state) {
      return;
    }

    if (metrics.counts && typeof metrics.counts === "object") {
      Object.keys(state.counts).forEach((key) => {
        state.counts[key] = Number(metrics.counts[key] || 0);
      });
    }

    if (
      typeof metrics.shareCount === "number" &&
      Number.isFinite(metrics.shareCount)
    ) {
      state.shareCount = Math.max(0, Number(metrics.shareCount));
    }

    if (
      typeof metrics.commentCount === "number" &&
      Number.isFinite(metrics.commentCount)
    ) {
      state.commentCount = Math.max(0, Number(metrics.commentCount));
    }

    renderEpisodeState(episode, state);
  }

  async function persistReaction(
    episode,
    snapshot,
    nextReaction,
    previousReaction,
    requestId
  ) {
    const state = EPISODE_STATE.get(episode);
    if (!state || !state.anchor) {
      return;
    }

    const currentRequestId = typeof requestId === "number" ? requestId : 0;
    let payload = null;

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reaction",
          episodeId: state.anchor,
          reaction: nextReaction,
          previousReaction,
        }),
      });

      try {
        payload = await response.json();
      } catch (parseError) {
        payload = null;
      }

      if (!response.ok) {
        if (
          response.status >= 400 &&
          response.status < 500 &&
          (currentRequestId === 0 ||
            state.pendingRequestId === currentRequestId)
        ) {
          state.counts = cloneCounts(snapshot.counts);
          state.currentReaction = snapshot.currentReaction || null;
          renderEpisodeState(episode, state);
        }

        const message =
          (payload &&
            typeof payload === "object" &&
            "error" in payload &&
            payload.error) ||
          "Failed to persist reaction.";
        throw new Error(message);
      }

      if (payload?.metrics) {
        if (
          currentRequestId !== 0 &&
          state.pendingRequestId !== currentRequestId
        ) {
          syncEpisodeMetrics();
          return;
        }

        applyMetrics(episode, payload.metrics);
      }

      if (
        currentRequestId === 0 ||
        state.pendingRequestId === currentRequestId
      ) {
        state.pendingRequestId = 0;
      }
    } catch (error) {
      if (
        currentRequestId !== 0 &&
        state.pendingRequestId === currentRequestId
      ) {
        state.pendingRequestId = 0;
      }

      console.warn("Unable to persist reaction", error);
    }
  }

  async function persistShare(episode, previousShareCount) {
    const state = EPISODE_STATE.get(episode);
    if (!state || !state.anchor) {
      return;
    }

    let payload = null;

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "share", episodeId: state.anchor }),
      });

      try {
        payload = await response.json();
      } catch (parseError) {
        payload = null;
      }

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          state.shareCount = previousShareCount;
          renderEpisodeState(episode, state);
        }

        const message =
          (payload &&
            typeof payload === "object" &&
            "error" in payload &&
            payload.error) ||
          "Failed to record share.";
        throw new Error(message);
      }

      if (payload?.metrics) {
        applyMetrics(episode, payload.metrics);
      }
    } catch (error) {
      console.warn("Unable to record share", error);
    }
  }

  async function syncEpisodeMetrics() {
    if (!episodes.length) {
      return;
    }

    const anchorToEpisode = new Map();

    episodes.forEach((episode) => {
      const state = EPISODE_STATE.get(episode);
      if (state?.anchor) {
        anchorToEpisode.set(state.anchor, episode);
      }
    });

    const episodeIds = Array.from(anchorToEpisode.keys());

    if (!episodeIds.length) {
      return;
    }

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", episodeIds }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load metrics.");
      }

      const metrics = payload?.metrics;

      if (!metrics || typeof metrics !== "object") {
        return;
      }

      Object.entries(metrics).forEach(([anchor, metric]) => {
        const episodeRef = anchorToEpisode.get(anchor);
        if (!episodeRef) {
          return;
        }

        applyMetrics(episodeRef, metric);
      });
    } catch (error) {
      console.warn("Unable to load episode metrics", error);
    }
  }
  function ensureEpisodeId(episode, index) {
    if (episode.id) {
      return episode.id;
    }

    const candidate =
      episode.dataset.anchor ||
      episode.dataset.slug ||
      episode.dataset.title ||
      episode.querySelector(".ep-title")?.textContent ||
      `episode-${index + 1}`;

    const slug = candidate
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    episode.id = slug ? `episode-${slug}` : `episode-${index + 1}`;
    return episode.id;
  }

  function showPicker(picker) {
    if (!picker) return;
    window.clearTimeout(pickerHideTimer);

    if (activePicker && activePicker !== picker) {
      activePicker.classList.remove("is-visible");
    }

    picker.classList.add("is-visible");
    activePicker = picker;
  }

  function hidePicker(picker, immediate) {
    if (!picker) return;
    const close = () => {
      picker.classList.remove("is-visible");
      if (activePicker === picker) {
        activePicker = null;
      }
    };

    if (immediate) {
      close();
      return;
    }

    window.clearTimeout(pickerHideTimer);
    pickerHideTimer = window.setTimeout(close, 120);
  }

  function renderEpisodeState(episode, state) {
    const { counts, elements, currentReaction, commentCount, shareCount } =
      state;

    const totals = REACTIONS.map((reaction) => ({
      type: reaction.type,
      emoji: reaction.emoji,
      count: counts[reaction.type] || 0,
      label: reaction.label,
    })).filter((entry) => entry.count > 0);

    const totalReactions = totals.reduce((sum, entry) => sum + entry.count, 0);

    elements.summaryIcons.innerHTML = "";
    if (totalReactions > 0) {
      totals
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .forEach((entry) => {
          const icon = document.createElement("span");
          icon.className = "summary-icon";
          icon.textContent = entry.emoji;
          elements.summaryIcons.append(icon);
        });
      elements.summaryCount.textContent = formatNumber(totalReactions);
      elements.summary.classList.add("is-visible");
    } else {
      elements.summaryCount.textContent = "";
      elements.summary.classList.remove("is-visible");
    }

    if (currentReaction) {
      const activeReaction = REACTIONS.find(
        (reaction) => reaction.type === currentReaction
      );
      elements.likeButton.classList.add("social-action--active");
      elements.likeIcon.textContent = activeReaction?.emoji || "\u{1F44D}";
      elements.likeLabel.textContent = activeReaction?.label || "Like";
    } else {
      elements.likeButton.classList.remove("social-action--active");
      elements.likeIcon.textContent = "\u{1F44D}";
      elements.likeLabel.textContent = "Like";
    }

    elements.sharesStat.textContent = formatPlural(shareCount, "share");
  }

  function selectReaction(episode, reactionType) {
    const state = EPISODE_STATE.get(episode);
    if (!state) {
      return;
    }

    const normalizedReaction =
      typeof reactionType === "string" && reactionType.trim() !== ""
        ? reactionType.trim()
        : null;

    if (
      normalizedReaction &&
      !Object.prototype.hasOwnProperty.call(state.counts, normalizedReaction)
    ) {
      return;
    }

    const previousReaction = state.currentReaction || null;
    const snapshot = {
      counts: cloneCounts(state.counts),
      currentReaction: previousReaction,
    };

    let nextReaction = normalizedReaction;

    if (previousReaction === normalizedReaction) {
      if (normalizedReaction) {
        state.counts[normalizedReaction] = Math.max(
          0,
          (state.counts[normalizedReaction] || 0) - 1
        );
      }
      nextReaction = null;
    } else {
      if (previousReaction && state.counts[previousReaction] !== undefined) {
        state.counts[previousReaction] = Math.max(
          0,
          (state.counts[previousReaction] || 0) - 1
        );
      }

      if (normalizedReaction) {
        state.counts[normalizedReaction] =
          (state.counts[normalizedReaction] || 0) + 1;
      }
    }

    state.currentReaction = nextReaction;
    const requestId = ++reactionRequestCounter;
    state.pendingRequestId = requestId;
    renderEpisodeState(episode, state);
    hidePicker(state.elements.picker, true);

    persistReaction(
      episode,
      snapshot,
      nextReaction,
      previousReaction,
      requestId
    );
  }
  async function handleShare(episode) {
    const state = EPISODE_STATE.get(episode);
    if (!state) {
      return;
    }

    const { elements, anchor } = state;
    const shareButton = elements.shareButton;
    const title =
      episode.dataset.title ||
      episode.querySelector(".ep-title")?.textContent?.trim() ||
      document.title;
    const text =
      episode.dataset.text ||
      episode.querySelector(".ep-text")?.textContent?.trim();
    const baseUrl = window.location.href.split("#")[0];
    const shareUrl = `${baseUrl}#${anchor}`;

    let shared = false;
    shareButton.disabled = true;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        shared = true;
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        shared = true;
      } else {
        window.prompt("Copy this link", shareUrl);
        shared = true;
      }
    } catch (error) {
      console.warn("Share failed or was cancelled", error);
    } finally {
      shareButton.disabled = false;
    }

    if (shared) {
      const previousShareCount = state.shareCount || 0;
      state.shareCount = previousShareCount + 1;
      shareButton.classList.add("social-action--active");
      window.setTimeout(() => {
        shareButton.classList.remove("social-action--active");
      }, 900);
      renderEpisodeState(episode, state);
      persistShare(episode, previousShareCount);
    }
  }

  function buildSocialBar(episode, index) {
    const body = episode.querySelector(".ep-body");
    if (!body) return;

    const counts = parseReactionCounts(episode.dataset.reactions);
    const commentCount = Number(
      episode.dataset.comments ?? episode.dataset.commentCount ?? 0
    );
    const shareCount = Number(
      episode.dataset.shares ?? episode.dataset.shareCount ?? 0
    );

    const socialBar = document.createElement("footer");
    socialBar.className = "social-bar";

    const summary = document.createElement("div");
    summary.className = "social-bar__summary";

    const summaryIcons = document.createElement("div");
    summaryIcons.className = "social-bar__summary-icons";

    const summaryCount = document.createElement("span");
    summaryCount.className = "social-bar__summary-count";

    summary.append(summaryIcons, summaryCount);

    const actions = document.createElement("div");
    actions.className = "social-bar__actions";

    const reactionAction = document.createElement("div");
    reactionAction.className = "reaction-action";

    const picker = document.createElement("div");
    picker.className = "reaction-picker";

    REACTIONS.forEach((reaction) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.reaction = reaction.type;
      button.setAttribute("aria-label", reaction.label);
      button.textContent = reaction.emoji;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        selectReaction(episode, reaction.type);
      });
      picker.append(button);
    });

    const likeButton = document.createElement("button");
    likeButton.type = "button";
    likeButton.className = "social-action reaction-toggle";
    likeButton.innerHTML =
      '<span class="social-action__icon">\u{1F44D}</span><span class="social-action__label">Like</span>';

    const likeIcon = likeButton.querySelector(".social-action__icon");
    const likeLabel = likeButton.querySelector(".social-action__label");

    likeButton.addEventListener("click", (event) => {
      event.preventDefault();

      const state = EPISODE_STATE.get(episode);
      if (!state) {
        return;
      }

      if (!supportsHover && !picker.classList.contains("is-visible")) {
        showPicker(picker);
        return;
      }

      if (state.currentReaction) {
        selectReaction(episode, state.currentReaction);
        return;
      }

      selectReaction(episode, "like");
    });

    if (supportsHover) {
      reactionAction.addEventListener("mouseenter", () => {
        showPicker(picker);
      });
      reactionAction.addEventListener("mouseleave", () => {
        hidePicker(picker, false);
      });
    }

    reactionAction.append(picker, likeButton);
    actions.append(reactionAction);

    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.className = "social-action share-action";
    shareButton.innerHTML =
      '<span class="social-action__icon">\u{2197}\u{FE0F}</span><span class="social-action__label">Share</span>';
    shareButton.addEventListener("click", (event) => {
      event.preventDefault();
      handleShare(episode);
    });

    actions.append(shareButton);

    const stats = document.createElement("div");
    stats.className = "social-bar__stats";

    const sharesStat = document.createElement("span");
    sharesStat.className = "social-bar__shares";

    stats.append(sharesStat);

    socialBar.append(summary, actions, stats);
    body.append(socialBar);

    const anchorId = ensureEpisodeId(episode, index);

    EPISODE_STATE.set(episode, {
      counts,
      currentReaction: null,
      commentCount,
      shareCount,
      anchor: anchorId,
      pendingRequestId: 0,
      elements: {
        summary,
        summaryIcons,
        summaryCount,
        likeButton,
        likeIcon,
        likeLabel,
        picker,
        sharesStat,
        shareButton,
      },
    });

    renderEpisodeState(episode, EPISODE_STATE.get(episode));
  }

  document.addEventListener("pointerdown", (event) => {
    if (!activePicker) return;
    const owner = activePicker.closest(".reaction-action");
    if (owner && owner.contains(event.target)) {
      return;
    }

    hidePicker(activePicker, true);
  });

  episodes.forEach((episode, index) => {
    buildSocialBar(episode, index);
  });

  syncEpisodeMetrics();

  let currentTopic = "all";
  let currentPage = 1;

  function createSentinel(container) {
    const el = document.createElement("div");
    el.id = "episode-sentinel";
    el.className = "load-more-sentinel d-flex justify-content-center py-4";
    el.setAttribute("aria-hidden", "true");
    el.style.width = "100%";
    el.style.height = "1px";
    el.style.margin = "0";
    el.style.opacity = "0";
    el.style.overflow = "hidden";
    el.style.pointerEvents = "none";
    el.style.padding = "0";
    // Remove the spinner HTML - leave it empty
    el.innerHTML = "";
    container.appendChild(el);
    return el;
  }

  const sentinel = episodesContainer ? createSentinel(episodesContainer) : null;

  const observer =
    sentinel &&
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          if (sentinel) {
            sentinel.classList.add("is-loading");
            sentinel.style.height = "";
            sentinel.style.opacity = "1";
            sentinel.style.overflow = "visible";
            sentinel.style.padding = "1.5rem 0";
            sentinel.style.pointerEvents = "none";
          }

          if (observer && sentinel) {
            observer.unobserve(sentinel);
          }

          const filteredEpisodes = getFilteredEpisodes(currentTopic);
          const totalPages = Math.ceil(
            filteredEpisodes.length / EPISODES_PER_PAGE
          );

          if (currentPage < totalPages) {
            currentPage += 1;
            renderEpisodes();
          }
        });
      },
      { rootMargin: "0px 0px 200px 0px" }
    );

  function getFilteredEpisodes(topic) {
    return episodes.filter(
      (episode) => topic === "all" || episode.dataset.topic === topic
    );
  }

  function renderEpisodes() {
    const filteredEpisodes = getFilteredEpisodes(currentTopic);
    const visibleEpisodes = filteredEpisodes.slice(
      0,
      currentPage * EPISODES_PER_PAGE
    );

    episodes.forEach((episode) => {
      episode.style.display = "none";
      episode.setAttribute("aria-hidden", "true");
    });

    visibleEpisodes.forEach((episode) => {
      episode.style.display = "";
      episode.setAttribute("aria-hidden", "false");
    });

    if (sentinel) {
      sentinel.classList.remove("is-loading");

      const hasMoreToLoad = filteredEpisodes.length > visibleEpisodes.length;

      if (hasMoreToLoad) {
        sentinel.style.display = "";
        sentinel.style.height = "1px";
        sentinel.style.opacity = "0";
        sentinel.style.overflow = "hidden";
        sentinel.style.padding = "0";
        sentinel.style.pointerEvents = "none";

        if (observer) {
          observer.observe(sentinel);
        }
      } else {
        sentinel.style.display = "none";

        if (observer) {
          observer.unobserve(sentinel);
        }
      }
    }

    if (window.AOS) {
      setTimeout(() => {
        AOS.refreshHard();
      }, 0);
    }
  }

  function setActiveButton(target) {
    buttons.forEach((button) => {
      const isActive = button === target;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function handleSelection(topic, button) {
    currentTopic = topic;
    currentPage = 1;
    setActiveButton(button);
    renderEpisodes();

    if (topic && topic !== "all") {
      history.replaceState(null, "", `#${topic}`);
    } else {
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }
  }

  function updateScrollButton() {
    if (!scrollTopBtn) return;

    const shouldShow = window.scrollY > SCROLL_THRESHOLD;
    scrollTopBtn.classList.toggle("active", shouldShow);
  }
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetLink = button.dataset.link;

      if (targetLink) {
        window.location.href = targetLink;
        return;
      }

      handleSelection(button.dataset.topic || "all", button);
    });
  });

  if (scrollTopBtn) {
    window.addEventListener("scroll", updateScrollButton, {
      passive: true,
    });

    scrollTopBtn.addEventListener("click", (event) => {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    updateScrollButton();
  }

  const hashTopic = window.location.hash.replace("#", "");
  const initialTopicOverride =
    episodesContainer && episodesContainer.dataset.initialTopic;

  const initialButton =
    buttons.find((button) => button.dataset.topic === hashTopic) ||
    (initialTopicOverride
      ? buttons.find((button) => button.dataset.topic === initialTopicOverride)
      : null) ||
    buttons.find((button) => button.classList.contains("active")) ||
    buttons[0];

  if (initialButton) {
    handleSelection(initialButton.dataset.topic || "all", initialButton);
  } else {
    renderEpisodes();
  }
});
