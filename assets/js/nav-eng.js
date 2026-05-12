document.getElementById("navbar").innerHTML = `
<div class="left-sidebar" id="leftSidebar">
  <div class="sidebar-header">
    <h3><i class="bi bi-soundwave"></i> Pronunciation Practice</h3>
  </div>

  <div class="sidebar-section">
    <a href="../../index.html" class="sidebar-link active">
      <i class="bi bi-house-door"></i> Home
    </a>
  </div>

  <div class="sidebar-section">
    <div class="sidebar-section-title">Economist Audio</div>
    <div class="sidebar-dropdown close">
      <button
        class="sidebar-dropdown-toggle"
        type="button"
        aria-expanded="true"
        aria-controls="sidebar-rfi-2025"
      >
        <span class="toggle-label">
          <i class="bi bi-calendar3"></i>
          2025
        </span>
        <i class="bi bi-chevron-right toggle-icon"></i>
      </button>
      <div id="sidebar-E2025" class="sidebar-submenu">
        <a href="/fr/pron/E251218/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> Economist 12/18/25
        </a>
      </div>
    </div>    
  </div>
  <div class="sidebar-section">
    <div class="sidebar-section-title">Other French Resources</div>
  <a href="../../../french.html" class="sidebar-link">
    <i class="bi bi-journal-text"></i> French Main
  </a>
  <a href="../../expression/archive.html" class="sidebar-link">
    <i class="bi bi-journal-text"></i> French Expressions
  </a>
  <a href="../../enunciation/r/index.html" class="sidebar-link">
    <i class="bi bi-megaphone"></i> French Enunciation
  </a>
  <a href="../../reading/index.html" class="sidebar-link">
    <i class="bi bi-book"></i> Reading Practice
  </a>
  <a href="../../grammar/index.html" class="sidebar-link">
    <i class="bi bi-card-list"></i> French Grammar
  </a>
  <a href="../../../../comedy/index.html" class="sidebar-link">
    <i class="bi bi-emoji-smile"></i> French Jokes
  </a>
</div>
</div>
`;
