# Adding a New Expression Page

This document describes the full procedure for adding a new "Les Expressions"
page to `fr/expression/` and wiring it into `archive.html`.

---

## File locations

| File | Path |
|---|---|
| Expression page | `fr/expression/<topic>.html` |
| Archive index | `fr/expression/archive.html` |
| Shared nav script | `assets/js/nav-expression.js` |
| Shared page script | `assets/js/expression.js` |
| Shared stylesheet | `assets/css/expression.css` (page) / `assets/css/frArchive.css` (archive) |

---

## Step 1 — Create `<topic>.html`

Copy an existing page (`compliment.html`, `regret.html`, or `fatigue.html`) as
a template. Update:

- `<title>` → `Les Expressions — <Topic in English>`
- `<h1 class="post-title">` → `Expressions of <topic> in French`
- `<p class="lead-intro">` → one-sentence description of what the buttons reveal
- Keep the navbar/script includes unchanged:
  `<script type="module" src="../../assets/js/nav-expression.js"></script>` and
  `<script type="module" src="../../assets/js/expression.js"></script>`

### Category sections

Group related expressions into 2–4 themed subsections. Each subsection is a
toggle button + a collapse panel:

```html
<button
  class="btn btn-outline-primary toggle-btn"
  data-bs-toggle="collapse"
  data-bs-target="#some-id"
>
  🎯 Section label
</button>
<div id="some-id" class="collapse">
  <div class="p-3 border rounded" data-aos="fade-up">
    <div class="expression-card p-4 mt-4" data-aos="fade-up">
      <div class="expression-quote">
        "French phrase." <span class="phonetic"> /ipa/</span>
      </div>
      <p class="expression-note mb-0">"English translation." (optional note)</p>
    </div>
    <!-- repeat expression-card for each phrase -->
  </div>
</div>
<br /><br />
```

Notes:
- Rotate `btn-outline-*` colors across sections (`primary`, `success`,
  `danger`, `secondary`, `warning`, `info`) so buttons are visually distinct.
- Use `data-bs-toggle`/`data-bs-target` (not the bare `data-target` seen in
  older pages) — `expression.js` supports both, but `data-bs-*` is the correct
  Bootstrap 5 attribute.
- The `<span class="phonetic">` IPA tag is optional; only add it when the
  pronunciation isn't obvious from spelling.
- Each panel's `id` must be unique within the page (used by the button's
  `data-bs-target`).

### Right rail

Keep the same structure: 3 `feature-item` picks (staggered
`data-aos-delay="50/150/250"`) and a "Recent Posts" list linking to a few
other existing expression pages (pick topically or recently added ones).

---

## Step 2 — Update `archive.html`

Two additions, both keyed by the same anchor id (e.g. `#fatigue`):

**a) Sidebar link** — insert alphabetically into the `#spy` nav list:

```html
<a
  class="list-group-item list-group-item-action"
  href="#<anchor-id>"
  >😴 <Topic Label></a
>
```

**b) Grid card** — insert alphabetically into the card grid:

```html
<!-- <Topic Label> -->
<div
  class="col-md-6"
  id="<anchor-id>"
  data-aos="fade-up"
  data-aos-delay="100"
  data-aos-once="false"
>
  <div class="card fx-card b-<color>">
    <span class="emoji-dot dot-<color>" aria-hidden="true"
      ><i class="bi bi-<icon>"></i
    ></span>
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start">
        <h3 class="card-title mb-2"><Topic Label></h3>
        <a class="small text-decoration-none" href="<topic>.html"
          >Voir plus →</a
        >
      </div>
      <ul class="list ps-3">
        <li>• French — <em>English</em></li>
        <li>• French — <em>English</em></li>
        <li>• French — <em>English</em></li>
      </ul>
    </div>
  </div>
</div>
```

Pick 3 short, representative phrases for the card (not necessarily the
"featured" ones used in the page's right rail).

Available `b-*` / `dot-*` color pairs (from `frArchive.css`, pick one not
used by the immediately adjacent cards): `blue`, `red`, `violet`, `orange`,
`teal`, `pumpkin`, `crimson`, `green`, `yellow`, `pink`, `indigo`, `cyan`,
`lime`, `amber`. Pick a Bootstrap Icons class (`bi bi-*`) that matches the
theme.

---

## Step 3 — Cache-busting (usually not needed)

Unlike `assets/js/nav-conv.js` (used by the conversations section, which
keeps a per-page array and requires a `?v=` bump on every HTML file whenever
it changes — see `fr/everyday/conversations/SKILL.md`), `nav-expression.js`
and `expression.js` are page-agnostic: they contain no per-page list and are
not referenced with a `?v=` query string anywhere in `fr/expression/`. Adding
a new expression page requires **no changes** to either script and **no**
version bump. Only touch this step if you actually edit the shared JS files
themselves (e.g. changing toggle behavior) — in that case, verify the change
doesn't break existing pages, since every expression page shares the same
script with no versioning safety net.

---

## Checklist

- [ ] `<topic>.html` created from an existing page template
- [ ] 2–4 collapsible sections added, each using `data-bs-toggle`/`data-bs-target`
- [ ] Right rail featured expressions + recent posts updated
- [ ] `archive.html` sidebar link added (alphabetical position)
- [ ] `archive.html` grid card added (alphabetical position, matching anchor id)
- [ ] Card uses a distinct `b-*`/`dot-*` color from its neighbors
- [ ] No JS changes were made — if they were, confirm no other expression page broke
