document.getElementById("navbar").innerHTML = `
    <div class="left-sidebar" id="leftSidebar">
  <div class="sidebar-header">
    <h3><i class="bi bi-book"></i> &nbsp;Reading Practice</h3>
  </div>

  <div class="sidebar-button">
    <a href="../../../index.html" class="sidebar-link">
      <i class="bi bi-house-door"></i> Home
    </a>
  </div>
  <div class="sidebar-button">
    <a href="../../french.html" class="sidebar-link">
      <i class="bi bi-folder2-open"></i>
      French Main
    </a>
  </div>
  <div class="sidebar-button">
    <button
      class="btn btn-outline-primary btn-sm"
      onclick="toggleTranslations()"
    >
      <i class="bi bi-eye"></i> Toggle Translations
    </button>
  </div>
  <div class="sidebar-button">
    <button class="btn btn-outline-primary btn-sm" onclick="toggleGlossary()">
      <i class="bi bi-book-half"></i> Toggle Glossary
    </button>
  </div>

  <div class="sidebar-section">
    <div class="sidebar-section-title">Categories</div>
    <div class="sidebar-dropdown close">
      <button
        class="sidebar-dropdown-toggle"
        type="button"
        aria-expanded="true"
        aria-controls="culture"
      >
        <span class="toggle-label">
          <i class="bi bi-buildings"></i>
          Culture
        </span>
        <i class="bi bi-chevron-right toggle-icon"></i>
      </button>
      <div id="culture" class="sidebar-submenu">
        <a href="index.html" class="sidebar-link">
          🥐 &nbsp;Un dimanche en France
        </a>
        <a href="religion.html" class="sidebar-link">
          🙏 &nbsp;La France et la religion
        </a>
      </div>
    </div>
    <div class="sidebar-dropdown close">
      <button
        class="sidebar-dropdown-toggle"
        type="button"
        aria-expanded="true"
        aria-controls="nature"
      >
        <span class="toggle-label">
          <i class="bi bi-card-image"></i>
          Nature
        </span>
        <i class="bi bi-chevron-right toggle-icon"></i>
      </button>
      <div id="nature" class="sidebar-submenu">
        <a href="wolf.html" class="sidebar-link"> 🐺 &nbsp;Les loups </a>
        <a href="beluga.html" class="sidebar-link"> 🐋 &nbsp;Le béluga </a>
        <a href="bumblebee.html" class="sidebar-link"> 🐝 &nbsp;Les bourdons </a>
        <a href="beaver.html" class="sidebar-link"> 🦫 &nbsp;Les castors </a>
        <a href="water.html" class="sidebar-link"> 💦 &nbsp;Le cycle de l’eau </a>
        <a href="tree.html" class="sidebar-link"> 🌳 &nbsp;Les arbres </a>
        <a href="groundwater.html" class="sidebar-link"> 💧 &nbsp;L’eau souterraine </a>
        <a href="amber.html" class="sidebar-link"> 🟨 &nbsp;L'ambre </a>
        <a href="kelp.html" class="sidebar-link"> 🪸 &nbsp;Le varech </a>
        <a href="pumice.html" class="sidebar-link"> 🌋 &nbsp;Pierre ponce </a>
        <a href="pitcher.html" class="sidebar-link"> 🪰 &nbsp;Les plantes-pièges </a>
        <a href="otter.html" class="sidebar-link"> 🦦 &nbsp;La loutre de mer </a>
      </div>
    </div>
    <div class="sidebar-dropdown close">
      <button
        class="sidebar-dropdown-toggle"
        type="button"
        aria-expanded="true"
        aria-controls="history"
      >
        <span class="toggle-label">
          <i class="bi bi-clock-history"></i>
          History
        </span>
        <i class="bi bi-chevron-right toggle-icon"></i>
      </button>
      <div id="history" class="sidebar-submenu">
        <a href="float.html" class="sidebar-link"> 🚣‍♀️ &nbsp;Marchés flottants </a>
      </div>
      <div id="history" class="sidebar-submenu">
        <a href="giethoorn.html" class="sidebar-link"> 🏡 &nbsp;Giethoorn </a>
      </div>      
      <div id="history" class="sidebar-submenu">
        <a href="human.html" class="sidebar-link"> 🪨 &nbsp;Homo Sapiens </a>
      </div>
    </div>
    <div class="sidebar-dropdown close">
      <button
        class="sidebar-dropdown-toggle"
        type="button"
        aria-expanded="true"
        aria-controls="cholesterol"
      >
        <span class="toggle-label">
          <i class="bi bi-heart-pulse"></i>
          Health
        </span>
        <i class="bi bi-chevron-right toggle-icon"></i>
      </button>
      <div id="cholesterol" class="sidebar-submenu">
        <a href="cholesterol.html" class="sidebar-link"> 🥦 &nbsp;Cholestérol </a>
      </div>
      <div id="brain" class="sidebar-submenu">
        <a href="brain.html" class="sidebar-link"> 🧠 &nbsp;Le cerveau </a>
      </div>
      <div id="eye" class="sidebar-submenu">
        <a href="eye.html" class="sidebar-link"> 👁️ &nbsp;L'œil humain </a>
      </div>
      <div id="kidney" class="sidebar-submenu">
        <a href="kidney.html" class="sidebar-link"> 🫘 &nbsp;Le rein humain </a>
      </div>
    </div>
    <div class="sidebar-dropdown close">
      <button
        class="sidebar-dropdown-toggle"
        type="button"
        aria-expanded="true"
        aria-controls="science"
      >
        <span class="toggle-label">
          <i class="bi bi-lightning"></i>
          Science
        </span>
        <i class="bi bi-chevron-right toggle-icon"></i>
      </button>
      <div id="science" class="sidebar-submenu">
        <a href="geothermal.html" class="sidebar-link">
          🔬 &nbsp;L’énergie géothermique
        </a>
        <a href="earth.html" class="sidebar-link">
          🌎 &nbsp;La Terre
        </a>
        <a href="meteorite.html" class="sidebar-link">
          ☄️ &nbsp;L’astéroïde
        </a>
      </div>
    </div>
    <div class="sidebar-section">
    <div class="sidebar-section-title">Other French Resources</div>
  <a href="../../../french.html" class="sidebar-link">
    <i class="bi bi-journal-text"></i> French Main
  </a>
  <a href="../expression/archive.html" class="sidebar-link">
    <i class="bi bi-journal-text"></i> French Expressions
  </a>  
  <a href="../pron/RFI260202/index.html" class="sidebar-link">
    <i class="bi bi-soundwave"></i> French Pronunciation
  </a>
  <a href="../enunciation/r/index.html" class="sidebar-link">
    <i class="bi bi-megaphone"></i> French Enunciation
  </a>
  <a href="../grammar/index.html" class="sidebar-link">
    <i class="bi bi-card-list"></i> French Grammar
  </a>
  <a href="../../../comedy/index.html" class="sidebar-link">
    <i class="bi bi-emoji-smile"></i> French Jokes
  </a>
  </div>
</div>

`;

(function () {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#navbar .sidebar-link').forEach(function (link) {
    const linkPage = (link.getAttribute('href') || '').split('/').pop();
    if (linkPage === currentPage) {
      link.classList.add('active');
      const submenu = link.closest('.sidebar-submenu');
      if (submenu) {
        const dropdown = submenu.closest('.sidebar-dropdown');
        if (dropdown) dropdown.classList.add('open');
      }
    }
  });
})();
