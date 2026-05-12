(function() {
  // Determine base path based on current location
  const path = window.location.pathname;
  const isInSubfolder = path.includes('/alphabet/') || path.includes('/dates/') || path.includes('/numbers/') || path.includes('/time/');
  const basePath = isInSubfolder ? '../' : '';

  const navHTML = `
    <div class="nav-menu">
      <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation">
        <span class="hamburger-icon"></span>
      </button>
      <div class="nav-dropdown" id="navDropdown">
        <a href="${basePath}alphabet/index.html" class="nav-item">Alphabets</a>
        <a href="${basePath}dates/index.html" class="nav-item">Dates</a>
        <a href="${basePath}numbers/index.html" class="nav-item">Numbers</a>
        <a href="${basePath}time/index.html" class="nav-item">Time</a>
        <hr class="nav-divider">
        <a href="../../sitemap.html" class="nav-item">Sitemap</a>
      </div>
    </div>
  `;

  // Insert nav into the header
  const header = document.querySelector('.site-header .container > .d-flex');
  if (header) {
    const navContainer = document.createElement('div');
    navContainer.innerHTML = navHTML;
    header.appendChild(navContainer.firstElementChild);
  }

  // Toggle dropdown
  document.addEventListener('click', function(e) {
    const toggle = e.target.closest('#navToggle');
    const dropdown = document.getElementById('navDropdown');
    const navMenu = document.querySelector('.nav-menu');

    if (toggle) {
      navMenu.classList.toggle('active');
    } else if (!e.target.closest('.nav-dropdown')) {
      if (navMenu) navMenu.classList.remove('active');
    }
  });

  // Close on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const navMenu = document.querySelector('.nav-menu');
      if (navMenu) navMenu.classList.remove('active');
    }
  });
})();
