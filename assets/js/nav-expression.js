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
          <a class="nav-link active" href="archive.html">Archive</a>
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
              <a class="dropdown-item" href="../../french.html">French Main</a>
            </li>
            <li>
              <a class="dropdown-item" href="../pron/RFI260202/index.html">French Pronunciation</a>
            </li>
            <li>
              <a class="dropdown-item" href="../enunciation/r/index.html">French Enunciation</a>
            </li>
            <li>
              <a class="dropdown-item" href="../reading/index.html">Reading Practice</a>
            </li>
            <li>
              <a class="dropdown-item" href="../grammar/index.html">French Grammar</a>
            </li>
            <li>
              <a class="dropdown-item" href="../../comedy/index.html">French Jokes</a>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</nav>
`;
