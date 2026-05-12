const pathParts = window.location.pathname.split("/").filter(Boolean);
const enunIndex = pathParts.indexOf("enunciation");

const rootParts = enunIndex >= 2 ? pathParts.slice(0, enunIndex - 1) : [];
const rootPrefix = `/${rootParts.join("/")}${rootParts.length ? "/" : ""}`;
const enunPrefix =
  enunIndex >= 0 ? `/${pathParts.slice(0, enunIndex + 1).join("/")}/` : "/";

const homePath = `${rootPrefix}index.html`;
const consonantPath = `${enunPrefix}consonant.html`;
const vowelPath = `${enunPrefix}vowel.html`;
const nasalPath = `${enunPrefix}nasal.html`;
const liaisonPath = `${enunPrefix}liaison.html`;
const frenchMainPath = `${rootPrefix}french.html`;
const expressionsPath = `${rootPrefix}fr/expression/archive.html`;
const pronPath = `${rootPrefix}fr/pron/RFI260202/index.html`;
const readingPath = `${rootPrefix}fr/reading/index.html`;
const grammarPath = `${rootPrefix}fr/grammar/index.html`;
const comedyPath = `${rootPrefix}comedy/index.html`;

document.getElementById("navbar").innerHTML = `
  <div class="left-sidebar" id="leftSidebar">
    <div class="sidebar-header">
      <h3><i class="bi bi-soundwave"></i> Phonetic Practice</h3>
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
          <a href="${vowelPath}" class="sidebar-link">
            👄 Oral Vowels
          </a>
          <a href="${nasalPath}" class="sidebar-link">
            👃 Nasal Vowels
          </a>
          <a href="${liaisonPath}" class="sidebar-link">
            🔗 Liaison
          </a>
        </div>
      </div>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-section-title">Collins French Dictionary</div>
      <div class="sidebar-dropdown close">
        <button
        class="sidebar-dropdown-toggle"
        type="button"
        aria-expanded="true"
        aria-controls="vowels"
        >
        <span class="toggle-label">
          <i class="bi bi-calendar3"></i>
          Vowels
        </span>
        <i class="bi bi-chevron-right toggle-icon"></i>
      </button>
      <div id="vowels" class="sidebar-submenu">
        <a href="${enunPrefix}i/index.html" class="sidebar-link">
          <i class="bi bi-headphones"></i> /i/
        </a>
        <a href="${enunPrefix}e/index.html" class="sidebar-link">
          <i class="bi bi-headphones"></i> /e/
        </a>
        <a href="${enunPrefix}ε/index.html" class="sidebar-link">
          <i class="bi bi-headphones"></i> /ε/
        </a>
        <a href="${enunPrefix}a/index.html" class="sidebar-link">
          <i class="bi bi-headphones"></i> /a/
        </a>
        <a href="${enunPrefix}ɑ/index.html" class="sidebar-link">
          <i class="bi bi-headphones"></i> /ɑ/
        </a>
        <a href="${enunPrefix}ə/index.html" class="sidebar-link">
          <i class="bi bi-headphones"></i> /ə/
        </a>
        <a href="${enunPrefix}œ/index.html" class="sidebar-link">
          <i class="bi bi-headphones"></i> /œ/
        </a>
        <a href="${enunPrefix}ø/index.html" class="sidebar-link">
          <i class="bi bi-headphones"></i> /ø/
        </a>
        <a href="${enunPrefix}ɔ/index.html" class="sidebar-link">
          <i class="bi bi-headphones"></i> /ɔ/
        </a>
        <a href="${enunPrefix}o/index.html" class="sidebar-link">
          <i class="bi bi-headphones"></i> /o/
        </a>
        <a href="${enunPrefix}u/index.html" class="sidebar-link">
          <i class="bi bi-headphones"></i> /u/
        </a>
        <a href="${enunPrefix}y/index.html" class="sidebar-link">
          <i class="bi bi-headphones"></i> /y/
        </a>
      </div>
    </div>
    <div class="sidebar-dropdown close">
      <button
      class="sidebar-dropdown-toggle"
      type="button"
      aria-expanded="true"
      aria-controls="nasal"
    >
    <span class="toggle-label">
      <i class="bi bi-calendar3"></i>
      Nasal vowels
    </span>
    <i class="bi bi-chevron-right toggle-icon"></i>
  </button>
  <div id="nasal" class="sidebar-submenu">
      <a href="${enunPrefix}ɛ̃/index.html" class="sidebar-link">
        <i class="bi bi-headphones"></i> /ɛ̃/
      </a>
      <a href="${enunPrefix}œ̃/index.html" class="sidebar-link">
        <i class="bi bi-headphones"></i> /œ̃/
      </a>
      <a href="${enunPrefix}ɑ̃/index.html" class="sidebar-link">
        <i class="bi bi-headphones"></i> /ɑ̃/
      </a>
      <a href="${enunPrefix}ɔ̃/index.html" class="sidebar-link">
        <i class="bi bi-headphones"></i> /ɔ̃/
      </a>
    </div>
  </div>
  <div class="sidebar-dropdown close">
    <button
    class="sidebar-dropdown-toggle"
    type="button"
    aria-expanded="true"
    aria-controls="consonants"
    >
    <span class="toggle-label">
      <i class="bi bi-calendar3"></i>
      Consonants
    </span>
    <i class="bi bi-chevron-right toggle-icon"></i>
  </button>
  <div id="consonants" class="sidebar-submenu">
    <a href="${enunPrefix}r/index.html" class="sidebar-link">
      <i class="bi bi-headphones"></i> /ʀ/
    </a>
    <a href="${enunPrefix}ɲ/index.html" class="sidebar-link">
      <i class="bi bi-headphones"></i> /ɲ/
    </a>
    <a href="${enunPrefix}ɥ/index.html" class="sidebar-link">
      <i class="bi bi-headphones"></i> /ɥ/
    </a>
  </div>
</div>
</div>
<div class="sidebar-section">
  <div class="sidebar-section-title">Other French Resources</div>
  <a href="${frenchMainPath}" class="sidebar-link">
    <i class="bi bi-journal-text"></i> French Main
  </a>
  <a href="${expressionsPath}" class="sidebar-link">
    <i class="bi bi-journal-text"></i> French Expressions
  </a>
  <a href="${pronPath}" class="sidebar-link">
    <i class="bi bi-soundwave"></i> French Pronunciation
  </a>
  <a href="${readingPath}" class="sidebar-link">
    <i class="bi bi-book"></i> Reading Practice
  </a>
  <a href="${grammarPath}" class="sidebar-link">
    <i class="bi bi-card-list"></i> French Grammar
  </a>
  <a href="${comedyPath}" class="sidebar-link">
    <i class="bi bi-emoji-smile"></i> French Jokes
  </a>
</div>
</div>
`;
