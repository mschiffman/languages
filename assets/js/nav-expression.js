document.getElementById("navbar").innerHTML = `
<nav
  class="navbar navbar-expand-lg navbar-dark fixed-top shadow-sm navbar-custom"
>
  <div class="container-xl">
    <a class="navbar-brand d-flex flex-column lh-1" href="#">
      <span>Les Expressions</span>
      <p></p>
      <small class="brand-sub">A FRENCH LANGUAGE BLOG</small>
    </a>
    <button
      class="navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#nav"
      aria-controls="nav"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="nav">
      <ul class="navbar-nav ms-auto">
        <li class="nav-item">
          <a class="nav-link active" href="/index.html">Home</a>
        </li>
        <li class="nav-item">
          <a class="nav-link active" href="archive.html" target="_blank">Archive</a>
        </li>
        <li class="nav-item dropdown">
          <a
            class="nav-link dropdown-toggle active"
            href="#"
            id="resourcesDropdown"
            role="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            French Resources
          </a>
          <ul class="dropdown-menu" aria-labelledby="resourcesDropdown">
            <li>
              <a class="dropdown-item" href="/sitemap.html" target="_blank">French Main</a>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</nav>
`;
