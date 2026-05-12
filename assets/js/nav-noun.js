document.getElementById("sidebar-nav").innerHTML = `
<div class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <h3><i class="bi bi-book"></i> French Learning Hub</h3>
      </div>

      <nav class="nav flex-column">
        <div class="nav-category">MAIN MENU</div>

        <a class="nav-link" href="/index.html">
          <i class="bi bi-house-door"></i> Home
        </a>
        <a
          class="nav-link"
          href="#"
          data-bs-toggle="collapse"
          data-bs-target="#houseMenu"
        >
          <i class="bi bi-house-heart"></i> House
          <i class="bi bi-chevron-down ms-auto"></i>
        </a>
        <div class="collapse" id="houseMenu">
          <a class="dropdown-item" href="house.html">House and yard</a>
        </div>
        <div class="collapse" id="houseMenu">
          <a class="dropdown-item" href="kitchen.html">Kitchen</a>
        </div>

        <a
          class="nav-link"
          href="#"
          data-bs-toggle="collapse"
          data-bs-target="#healthMenu"
        >
          <i class="bi bi-heart-pulse"></i> Health
          <i class="bi bi-chevron-down ms-auto"></i>
        </a>
        <div class="collapse" id="healthMenu">
          <a class="dropdown-item" href="body.html">Body Parts</a>
          <a class="dropdown-item" href="#">Medical Terms</a>
          <a class="dropdown-item" href="#">Wellness</a>
          <a class="dropdown-item" href="#">Symptoms</a>
        </div>

        <a
          class="nav-link active"
          href="#"
          data-bs-toggle="collapse"
          data-bs-target="#earthMenu"
        >
          <i class="bi bi-globe"></i> Planet Earth
          <i class="bi bi-chevron-down ms-auto"></i>
        </a>
        <div class="collapse" id="earthMenu">
          <a class="dropdown-item" href="landforms.html">Landforms</a>
          <a class="dropdown-item" href="#">Weather</a>
          <a class="dropdown-item" href="#">Animals</a>
          <a class="dropdown-item" href="#">Plants</a>
          <a class="dropdown-item" href="#">Environment</a>
        </div>

        <a
          class="nav-link"
          href="#"
          data-bs-toggle="collapse"
          data-bs-target="#shopsMenu"
        >
          <i class="bi bi-shop"></i> Shops
          <i class="bi bi-chevron-down ms-auto"></i>
        </a>
        <div class="collapse" id="shopsMenu">
          <a class="dropdown-item" href="#">Grocery Store</a>
          <a class="dropdown-item" href="#">Bakery</a>
          <a class="dropdown-item" href="#">Pharmacy</a>
          <a class="dropdown-item" href="#">Clothing Store</a>
          <a class="dropdown-item" href="#">Market</a>
        </div>

        <a
          class="nav-link"
          href="#"
          data-bs-toggle="collapse"
          data-bs-target="#leisureMenu"
        >
          <i class="bi bi-palette"></i> Leisure
          <i class="bi bi-chevron-down ms-auto"></i>
        </a>
        <div class="collapse" id="leisureMenu">
          <a class="dropdown-item" href="#">Sports</a>
          <a class="dropdown-item" href="#">Hobbies</a>
          <a class="dropdown-item" href="#">Entertainment</a>
          <a class="dropdown-item" href="#">Arts & Culture</a>
          <a class="dropdown-item" href="#">Travel</a>
        </div>

        <a
          class="nav-link"
          href="#"
          data-bs-toggle="collapse"
          data-bs-target="#dayMenu"
        >
          <i class="bi bi-calendar-check"></i> Day to Day
          <i class="bi bi-chevron-down ms-auto"></i>
        </a>
        <div class="collapse" id="dayMenu">
          <a class="dropdown-item" href="#">Daily Routine</a>
          <a class="dropdown-item" href="#">Food & Drink</a>
          <a class="dropdown-item" href="#">Transportation</a>
          <a class="dropdown-item" href="#">Home & Family</a>
          <a class="dropdown-item" href="#">Work & School</a>
        </div>

        <div class="nav-category mt-3">French Resources</div>

        <a class="nav-link" href="/french.html">
          <i class="bi bi-journal-text"></i> French Main
        </a>

        <a class="nav-link" href="../../pron/RFI260202/index.html">
          <i class="bi bi-volume-up"></i> French Pronunciation
        </a>

        <a class="nav-link" href="../../expression/archive.html">
          <i class="bi bi-chat-quote"></i> French Expressions
        </a>

        <a class="nav-link" href="../../enunciation/r/index.html">
          <i class="bi bi-mic"></i> French Enunciation
        </a>

        <a class="nav-link" href="../../reading/index.html">
          <i class="bi bi-book"></i> Reading Practice
        </a>

        <a class="nav-link" href="../../grammar/index.html">
          <i class="bi bi-pencil-square"></i> French Grammar
        </a>

        <a class="nav-link" href="../../../comedy/index.html">
          <i class="bi bi-emoji-laughing"></i> French Jokes
        </a>
      </nav>
    </div>
`;
