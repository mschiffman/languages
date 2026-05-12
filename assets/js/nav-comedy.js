(() => {
  const buildNavMarkup = (title) => `
    <div class="hero-bar navbar navbar-expand-md navbar-dark p-0 w-100">
      <div class="hero-brand d-flex flex-wrap align-items-center gap-2 flex-grow-1">
        <span class="badge text-bg-dark border border-light-subtle">
          <i class="bi bi-stars me-1"></i>Fun Archive
        </span>
        <h1 class="m-0 fs-4 fw-bolder">${title}</h1>
      </div>

      <button
        class="navbar-toggler ms-2"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#heroNav"
        aria-controls="heroNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div
        class="collapse navbar-collapse hero-nav-wrapper mt-3 mt-md-0 ms-md-auto"
        id="heroNav"
      >
        <div
          class="hero-nav-links d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 small"
        >
          <a class="hero-nav-link hero-nav-item" href="../index.html">Home</a>
          <div class="dropdown hero-nav-item" data-bs-auto-close="outside">
            <a
              class="hero-nav-link dropdown-toggle"
              href="#"
              role="button"
              id="frenchResourcesDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              French Resources
            </a>
            <ul
              class="dropdown-menu"
              aria-labelledby="frenchResourcesDropdown"
            >
            <li>
                <a class="dropdown-item" href="../french.html">
                  French Main
                </a>
              </li>
              <li>
                <a class="dropdown-item" href="../fr/expression/archive.html">
                  French Expressions
                </a>
              </li>
              <li>
                <a class="dropdown-item" href="../fr/pron/RFI260202/index.html">
                  French Pronunciations
                </a>
              </li>
              <li>
                <a class="dropdown-item" href="../fr/enunciation/r/index.html">
                  French Enunciation
                </a>
              </li>
              <li>
                <a class="dropdown-item" href="../fr/reading/index.html">
                  Reading Practice
                </a>
              </li>
              <li>
                <a class="dropdown-item" href="../fr/grammar/index.html">
                  French Grammar
                </a>
              </li>
            </ul>
          </div>
          <div class="dropdown month-dropdown hero-nav-item" data-bs-auto-close="outside">
            <button
              class="btn btn-sm btn-outline-secondary dropdown-toggle text-white hero-dropdown-toggle"
              type="button"
              id="monthDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              Choose month
            </button>
            <ul
              class="dropdown-menu dropdown-menu-end"
              aria-labelledby="monthDropdown"
            >
              <li class="dropdown-submenu">
                <button
                  class="dropdown-item d-flex align-items-center justify-content-between submenu-toggle"
                  type="button"
                  aria-expanded="false"
                >
                  2025
                  <i
                    class="bi bi-chevron-down small opacity-75 submenu-caret"
                    aria-hidden="true"
                  ></i>
                </button>
                <ul class="dropdown-menu shadow">
                  <li>
                    <a class="dropdown-item" href="september.html">
                      September
                    </a>
                  </li>
                  <li>
                    <a class="dropdown-item" href="october.html">October</a>
                  </li>
                  <li>
                    <a class="dropdown-item" href="november.html">
                      November
                    </a>
                  </li>
                </ul>
              </li>
              <li>
                <span class="dropdown-item-text text-muted">
                  2026
                  <small class="text-uppercase fw-semibold ms-1">soon</small>
                </span>
              </li>
            </ul>
          </div>
          <div class="dropdown hero-nav-item">
            <button
              class="btn btn-sm btn-outline-secondary dropdown-toggle text-white hero-dropdown-toggle"
              type="button"
              id="languageDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              Choose language
            </button>
            <ul
              class="dropdown-menu dropdown-menu-end"
              aria-labelledby="languageDropdown"
            >
              <li>
                <button
                  class="dropdown-item language-option"
                  type="button"
                  data-lang="en"
                >
                  English
                </button>
              </li>
              <li>
                <button
                  class="dropdown-item language-option"
                  type="button"
                  data-lang="es"
                >
                  Espanol
                </button>
              </li>
              <li>
                <button
                  class="dropdown-item language-option"
                  type="button"
                  data-lang="fr"
                >
                  Francais
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;

  const mountNav = () => {
    const heroHeader = document.querySelector(".hero");

    if (!heroHeader || heroHeader.querySelector(".hero-bar")) {
      return;
    }

    const navTitle =
      heroHeader.getAttribute("data-nav-title") ||
      "Funny Episodes - October 2025";

    heroHeader.insertAdjacentHTML(
      "afterbegin",
      buildNavMarkup(navTitle).trim(),
    );
  };

  mountNav();
  document.addEventListener("DOMContentLoaded", mountNav);
})();
