const pathParts = window.location.pathname.split("/").filter(Boolean);
const enunIndex = pathParts.indexOf("enunciation");

const rootParts = enunIndex >= 2 ? pathParts.slice(0, enunIndex - 1) : [];
const rootPrefix = `/${rootParts.join("/")}${rootParts.length ? "/" : ""}`;
const enunPrefix =
  enunIndex >= 0 ? `/${pathParts.slice(0, enunIndex + 1).join("/")}/` : "/";

const homePath = `${rootPrefix}index.html`;
const consonantPath = `${enunPrefix}consonant.html`;
const monophthongPath = `${enunPrefix}monophthong.html`;
const diphthongPath = `${enunPrefix}diphthong.html`;

document.getElementById("navbar").innerHTML = `
  <div class="left-sidebar" id="leftSidebar">
    <div class="sidebar-header">
      <h3><i class="bi bi-soundwave"></i> English Pronunciation</h3>
      <button class="close-sidebar-btn" id="closeSidebarBtn" type="button" aria-label="Close navigation">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <div class="sidebar-section">
      <a href="${homePath}" class="sidebar-link active">
        <i class="bi bi-house-door"></i> Home
      </a>
      <div class="sidebar-dropdown close">
        <button
          class="sidebar-dropdown-toggle"
          type="button"
          aria-expanded="false"
          aria-controls="phonetic-rules"
        >
          <span class="toggle-label">
            <i class="bi bi-journal-text"></i>
            Phonetic Rules
          </span>
          <i class="bi bi-chevron-right toggle-icon"></i>
        </button>
        <div id="phonetic-rules" class="sidebar-submenu">
          <a href="${consonantPath}" class="sidebar-link">
            🗣️ Consonants
          </a>
          <a href="${monophthongPath}" class="sidebar-link">
            👄 Monophthongs
          </a>
          <a href="${diphthongPath}" class="sidebar-link">
            👄 Diphthongs
          </a>
        </div>
      </div>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-section-title">English Sounds</div>
      <div class="sidebar-dropdown close">
        <button
          class="sidebar-dropdown-toggle"
          type="button"
          aria-expanded="true"
          aria-controls="monophthongs"
        >
          <span class="toggle-label">
            <i class="bi bi-calendar3"></i>
            Monophthongs
          </span>
          <i class="bi bi-chevron-right toggle-icon"></i>
        </button>
        <div id="monophthongs" class="sidebar-submenu">
          <a href="${enunPrefix}e/index.html" class="sidebar-link">
            <i class="bi bi-headphones"></i> /e/ best
          </a>
          <a href="${enunPrefix}ae/index.html" class="sidebar-link">
            <i class="bi bi-headphones"></i> /æ/ dam
          </a>
          <a href="${enunPrefix}i/index.html" class="sidebar-link">
            <i class="bi bi-headphones"></i> /ɪ/ bit
          </a>
          <a href="${enunPrefix}er/index.html" class="sidebar-link">
            <i class="bi bi-headphones"></i> /ɜː/ err
          </a>
        </div>
      </div>
      <div class="sidebar-dropdown close">
        <button
          class="sidebar-dropdown-toggle"
          type="button"
          aria-expanded="true"
          aria-controls="diphthongs"
        >
          <span class="toggle-label">
            <i class="bi bi-calendar3"></i>
            Diphthongs
          </span>
          <i class="bi bi-chevron-right toggle-icon"></i>
        </button>
        <div id="diphthongs" class="sidebar-submenu">
          <a href="${enunPrefix}ei/index.html" class="sidebar-link">
            <i class="bi bi-headphones"></i> /eɪ/ bay
          </a>
          <a href="${enunPrefix}ai/index.html" class="sidebar-link">
            <i class="bi bi-headphones"></i> /aɪ/ buy
          </a>
          <a href="${enunPrefix}oi/index.html" class="sidebar-link">
            <i class="bi bi-headphones"></i> /ɔɪ/ oil
          </a>
          <a href="${enunPrefix}ou/index.html" class="sidebar-link">
            <i class="bi bi-headphones"></i> /oʊ/ go
          </a>
          <a href="${enunPrefix}ea/index.html" class="sidebar-link">
            <i class="bi bi-headphones"></i> /eə/ hair
          </a>
          <a href="${enunPrefix}ia/index.html" class="sidebar-link">
            <i class="bi bi-headphones"></i> /ɪə/ ear
          </a>
          <a href="${enunPrefix}ua/index.html" class="sidebar-link">
            <i class="bi bi-headphones"></i> /ʊə/ poor
          </a>
        </div>
      </div>
      <div class="sidebar-dropdown close">
        <button
          class="sidebar-dropdown-toggle"
          type="button"
          aria-expanded="true"
          aria-controls="eng-consonants"
        >
          <span class="toggle-label">
            <i class="bi bi-calendar3"></i>
            Consonants
          </span>
          <i class="bi bi-chevron-right toggle-icon"></i>
        </button>
        <div id="eng-consonants" class="sidebar-submenu">
        </div>
      </div>
    </div>
  </div>
`;
