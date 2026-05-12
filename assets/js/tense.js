(() => {
  const OFFSET = 150;
  const SCROLL_THRESHOLD = 300;

  const scrollToHash = (hash, updateHistory = true) => {
    if (!hash) {
      return;
    }

    const id = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!id) {
      return;
    }

    const target = document.getElementById(id);
    if (!target) {
      return;
    }

    const pageOffset = window.pageYOffset || document.documentElement.scrollTop;
    const targetTop = target.getBoundingClientRect().top + pageOffset;
    const destination = Math.max(targetTop - OFFSET, 0);

    window.scrollTo({
      top: destination,
      behavior: "smooth",
    });

    if (updateHistory) {
      history.pushState(null, "", `#${id}`);
    }
  };

  const initScrollTopButton = () => {
    const button = document.getElementById("scrollTopBtn");
    if (!button) {
      return;
    }

    const toggleVisibility = () => {
      const scrollPosition =
        window.pageYOffset || document.documentElement.scrollTop;
      if (scrollPosition > SCROLL_THRESHOLD) {
        button.classList.add("show");
      } else {
        button.classList.remove("show");
      }
    };

    toggleVisibility();
    window.addEventListener("scroll", toggleVisibility, { passive: true });
    button.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (location.hash) {
      setTimeout(() => scrollToHash(location.hash, false), 0);
    }

    const internalLinks = document.querySelectorAll(
      'a[href^="#"]:not([href="#"])'
    );
    internalLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        const hash = link.getAttribute("href");
        if (!hash || hash === "#") {
          return;
        }

        event.preventDefault();
        scrollToHash(hash);
      });
    });

    initScrollTopButton();
  });
})();
