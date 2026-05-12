const sidebarHTML = `
<style>
  /* Sidebar Hover Effects */
  #sidebar-nav a {
    display: block;
    padding: 8px 12px;
    border-radius: 6px;
    transition: all 0.2s ease-in-out;
  }
  #sidebar-nav a:hover {
    background-color: rgba(255, 255, 255, 0.15);
    padding-left: 16px;
    color: #fff !important;
  }
</style>
<!-- Sidebar Navigation -->
<button id="nav-toggle" class="btn btn-dark position-fixed top-0 start-0 m-3 rounded-circle shadow" style="z-index: 1060; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
  <i class="bi bi-list fs-4"></i>
</button>

<div id="sidebar-nav" class="bg-dark text-white position-fixed top-0 start-0 h-100 shadow" style="width: 280px; transform: translateX(-100%); transition: transform 0.3s ease-in-out; z-index: 1050; padding-top: 80px; overflow: auto;">
  <div class="px-4">
    <h5 class="mb-4 text-white-50">Navigation</h5>
    <ul class="list-unstyled">
      <li class="mb-3">
        <a href="./index.html" target="_blank" class="text-white text-decoration-none d-flex align-items-center">
          <i class="bi bi-house-door me-3 fs-5"></i> Home
        </a>
      </li>
      <li class="mb-3">
        <a href="./french.html" target="_blank" class="text-white text-decoration-none d-flex align-items-center">
          <i class="bi bi-translate me-3 fs-5"></i> French Main
        </a>
      </li>
      <li class="mb-3">
        <a href="../kitchen.html" class="text-white text-decoration-none d-flex align-items-center">
          <i class="bi bi-ladder me-3 fs-5"></i> Utensils
        </a>
        <ul class="list-unstyled ms-5 mt-2 small text-white-50">
          <li class="mb-2"><a href="anki_noun.html" class="text-white-50 text-decoration-none">Anki-Noun</a></li>
          <li class="mb-2"><a href="anki_verb.html" class="text-white-50 text-decoration-none">Anki-Verb</a></li>
          <li class="mb-2"><a href="fork.html" class="text-white-50 text-decoration-none">Collocation Web</a></li>
          <li class="mb-2"><a href="read.html" class="text-white-50 text-decoration-none">Read</a></li>
          <li class="mb-2"><a href="listen.html" class="text-white-50 text-decoration-none">Listening Lab</a></li>
          <li class="mb-2"><a href="listen-master.html" class="text-white-50 text-decoration-none">Listening Master</a></li>
          <li class="mb-2"><a href="rolePlay1.html" class="text-white-50 text-decoration-none">Role Play</a></li>
          <li class="mb-2"><a href="venn.html" class="text-white-50 text-decoration-none">Venn Diagram</a></li>
          <li class="mb-2"><a href="hotspot.html" class="text-white-50 text-decoration-none">Hotspots</a></li>
          <li class="mb-2"><a href="cloze.html" class="text-white-50 text-decoration-none">Cloze Test</a></li>
          <li class="mb-2"><a href="reorder.html" class="text-white-50 text-decoration-none">Reorder sentences</a></li>
          <li class="mb-2"><a href="translation.html" class="text-white-50 text-decoration-none">Translation</a></li>
          <li class="mb-2"><a href="create.html" class="text-white-50 text-decoration-none">Create</a></li>
          <li class="mb-2"><a href="coupant.html" class="text-white-50 text-decoration-none">arguisé vs coupant</a></li>
        </ul>
      </li>
    </ul>
  </div>
</div>
`;

document.addEventListener("DOMContentLoaded", function () {
  document.body.insertAdjacentHTML("afterbegin", sidebarHTML);

  const sidebar = document.getElementById("sidebar-nav");
  const toggle = document.getElementById("nav-toggle");

  toggle.addEventListener("click", function () {
    const isOpen = sidebar.style.transform === "translateX(0%)";
    sidebar.style.transform = isOpen ? "translateX(-100%)" : "translateX(0%)";
  });

  document.addEventListener("click", function (event) {
    const isOpen = sidebar.style.transform === "translateX(0%)";
    if (
      isOpen &&
      !sidebar.contains(event.target) &&
      !toggle.contains(event.target)
    ) {
      sidebar.style.transform = "translateX(-100%)";
    }
  });
});
