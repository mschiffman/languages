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
    <div class="sidebar-section-title">RFI News</div>

        <div class="sidebar-dropdown close">
      <button
        class="sidebar-dropdown-toggle"
        type="button"
        aria-expanded="true"
        aria-controls="sidebar-rfi-2026"
      >
        <span class="toggle-label">
          <i class="bi bi-calendar3"></i>
          2026
        </span>
        <i class="bi bi-chevron-right toggle-icon"></i>
      </button>
      <div id="sidebar-rfi-2026" class="sidebar-submenu">
        <a href="../RFI260202/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 02/02/26
        </a>
        <a href="../RFI260504/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 05/04/26
        </a>
      </div>
    </div>

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
      <div id="sidebar-rfi-2025" class="sidebar-submenu">
        <a href="../RFI250108/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 01/08/25
        </a>
        <a href="../RFI250117/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 01/17/25
        </a>
        <a href="../RFI250123/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 01/23/25
        </a>
        <a href="../RFI250127/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 01/27/25
        </a>
        <a href="../RFI250130/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 01/30/25
        </a>
        <a href="../RFI250130-2/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 01/30/25-2
        </a>
        <a href="../RFI250214/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 02/14/25
        </a>
        <a href="../RFI250513/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 05/13/25
        </a>
        <a href="../RFI250526/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 05/26/25
        </a>
        <a href="../RFI251009/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 10/9/25
        </a>
        <a href="../RFI251106/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 11/6/25
        </a>
        <a href="../RFI251216/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 12/16/25
        </a>
      </div>
    </div>
    
    <div class="sidebar-dropdown close">
      <button
        class="sidebar-dropdown-toggle"
        type="button"
        aria-expanded="true"
        aria-controls="sidebar-rfi-2024"
      >
        <span class="toggle-label">
          <i class="bi bi-calendar3"></i>
          2024
        </span>
        <i class="bi bi-chevron-right toggle-icon"></i>
      </button>
      <div id="sidebar-rfi-2024" class="sidebar-submenu">
        <a href="../RFI240104/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 1/4/24
        </a>
        <a href="../RFI240904/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 9/4/24
        </a>
        <a href="../RFI241205/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 12/5/24
        </a>
        <a href="../RFI241216/index.html" class="sidebar-link">
          <i class="bi bi-calendar"></i> RFI 12/16/24
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
