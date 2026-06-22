# English Enunciation Pages — How to Create a New Sound

## Folder structure

```
eng/enunciation/
  <sound>/
    index.html       ← one file per sound
  SKILL.md           ← this file
```

**Always use ASCII-safe folder names** — IPA symbols get percent-encoded in URLs
(`æ` → `%C3%A6`) which can break on some servers and CDNs. Keep IPA symbols
only in the HTML display text and nav labels.

### Monophthong folders
| IPA | Example | Folder |
|-----|---------|--------|
| /e/ | best | `e` |
| /æ/ | dam | `ae` |
| /ɪ/ | bit | `i` |
| /iː/ | beat | `ii` |
| /ʌ/ | cup | `u` |
| /ɑː/ | father | `aa` |
| /ɒ/ | hot | `o` |
| /ɔː/ | caught | `aw` |
| /ʊ/ | book | `uh` |
| /uː/ | boot | `uu` |
| /ɜː/ | bird | `er` |
| /ə/ | about | `schwa` |

### Diphthong folders
| IPA | Example | Folder |
|-----|---------|--------|
| /eɪ/ | face | `ei` |
| /aɪ/ | price | `ai` |
| /ɔɪ/ | choice | `oi` |
| /oʊ/ | goat | `ou` |
| /aʊ/ | mouth | `au` |
| /eə/ | hair | `ea` |
| /ɪə/ | ear | `ia` |
| /ʊə/ | poor | `ua` |

### Consonant folders
| IPA | Example | Folder |
|-----|---------|--------|
| /θ/ | think | `th` |
| /ð/ | this | `dh` |
| /ʃ/ | she | `sh` |
| /ʒ/ | measure | `zh` |
| /tʃ/ | church | `tch` |
| /dʒ/ | judge | `dj` |
| /ŋ/ | ring | `ng` |

## Steps to add a new sound

1. **Copy** `e/index.html` into a new folder (e.g. `ae/index.html`).
2. **Edit the 4 things that change per sound:**

   | What | Where in the file |
   |------|------------------|
   | Page `<title>` | `<head>` |
   | `<h1>` heading | `.top-header` |
   | `.glossary-title` label | inside `.content-box` |
   | `audioBase` URL | `<script>` before Bootstrap JS |

3. **Replace the word table rows** — English words must be in **alphabetical order**. Audio file names (`01.m4a`, `02.m4a`, …) must be in **ascending order** matching the table row order. Each row includes French IPA in a muted span:
   ```html
   <tr>
     <td onclick="playAudio('audio1')">word /IPA/</td>
     <td>French translation <span style="color: #888; font-size: 0.85em;">/French IPA/</span></td>
   </tr>
   ```

4. **Update `count`** in the audio script to match the number of rows.

5. **Add the sound link** to `assets/js/nav-enun-eng.js` under the correct section
   (Monophthongs / Diphthongs / Consonants).

6. **Add a node and link** to `english.html` at the root of `languages/`:
   - In `graphData.nodes`, insert a new entry under the "Enunciation children" comment:
     ```js
     {
       id: "/ɪ/ bit",        // ← IPA label matching the nav
       group: 1,
       level: 2,
       url: "eng/enunciation/i/index.html",   // ← folder name
     },
     ```
   - In `graphData.links`, add a corresponding edge:
     ```js
     { source: "Enunciation", target: "/ɪ/ bit" },
     ```
   Keep nodes and links in the same order (Monophthongs → Diphthongs → Consonants).

7. **Upload audio files** to Cloudflare at `https://languages.rmlives.com/eng/phonetics/<sound>/`
   named `01.m4a`, `02.m4a`, … matching the table row order.

## Audio script pattern

```js
const audioBase = "https://languages.rmlives.com/eng/phonetics/<sound>/";
const count = 20;   // ← change to match number of words
for (let i = 1; i <= count; i++) {
  const audio = document.createElement("audio");
  audio.id = "audio" + i;
  audio.src = audioBase + String(i).padStart(2, "0") + ".m4a";
  document.body.appendChild(audio);
}
```

## Shared assets (do not change paths)

| Asset | Path from sound folder |
|-------|----------------------|
| CSS | `../../../assets/css/pron.css` |
| Nav JS | `../../../assets/js/nav-enun-eng.js` |
| Phonetic JS | `../../../assets/js/phonetic.js` |

## Full HTML template

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1.0" name="viewport" />
    <title>English Phonetic Practice</title>

    <!-- Google tag (gtag.js) -->
    <script
      async
      src="https://www.googletagmanager.com/gtag/js?id=G-CHXHM9CZKM"
    ></script>

    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag("js", new Date());

      gtag("config", "G-CHXHM9CZKM");
    </script>

    <!-- Favicons -->
    <link href="/img/favicon.png" rel="icon" />

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com" rel="preconnect" />
    <link href="https://fonts.gstatic.com" rel="preconnect" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900&family=Montserrat:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900&display=swap"
      rel="stylesheet"
    />

    <!-- Bootstrap CSS -->
    <link
      href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css"
      rel="stylesheet"
    />
    <link
      href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.0/font/bootstrap-icons.min.css"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="../../../assets/css/pron.css" />
    <style>
      .sub {
        font-weight: bold;
        background-color: #e9ffff;
        font-size: 25px;
      }
    </style>
  </head>

  <body>
    <!-- Hamburger Menu Button -->
    <button class="hamburger-btn" id="hamburgerBtn">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <!-- Left Sidebar Navigation -->
    <div id="navbar"></div>
    <script
      type="module"
      src="../../../assets/js/nav-enun-eng.js?v=260622"
    ></script>

    <!-- Main Content Area -->

    <div class="main-content">
      <div class="top-header">
        <h1>English /æ/ as in <em>dam</em></h1>   <!-- ← change -->
      </div>

      <div class="content-container">
        <div class="mb-2" aria-hidden="true"></div>

        <p style="color: brown; font-size: 1.1em; margin-top: 0">
          <i>Click on the words to hear the pronunciation.</i>
        </p>

        <!-- Glossary Section -->
        <div class="content-box" id="glossary">
          <div class="glossary-title"><i class="bi bi-book"></i> &nbsp;/æ/</div>   <!-- ← change -->

          <table class="glossary-table">
            <thead>
              <tr style="color: #3498db; font-weight: 600">
                <th style="padding: 12px 8px">ENGLISH</th>
                <th style="padding: 12px 8px">FRENCH</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td onclick="playAudio('audio1')">word /IPA/</td>   <!-- ← change rows -->
                <td>French translation</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Audio elements generated from Cloudflare directory -->
    <script>
      const audioBase = "https://languages.rmlives.com/eng/phonetics/ae/";   // ← change
      const count = 20;   // ← change to match number of rows
      for (let i = 1; i <= count; i++) {
        const audio = document.createElement("audio");
        audio.id = "audio" + i;
        audio.src = audioBase + String(i).padStart(2, "0") + ".m4a";
        document.body.appendChild(audio);
      }
    </script>

    <!-- Bootstrap JS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>

    <!-- Custom JavaScript -->
    <script type="module" src="../../../assets/js/phonetic.js"></script>
  </body>
</html>
```
