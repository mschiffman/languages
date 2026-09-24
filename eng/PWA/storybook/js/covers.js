/* ===================================================================
   Drawn covers.
   Used until you drop a real media/<id>/cover.jpg next to the story.
   The scenery follows each story's palette; the animals keep the
   colours they have in life, so a fox still looks like a fox.
   =================================================================== */

const FUR = {
  fox: "#d4763a",
  foxDeep: "#a9501f",
  mouse: "#b9a08c",
  mouseDeep: "#a98d78",
  green: "#7fa83d",
  greenDeep: "#5d7f28",
  cream: "#fffdf5",
};

const MOTIFS = {
  /* ---------------- the lion, with the mouse who saves him ------------- */
  lion: (c) => `
    <g>
      ${ring(198, 158, 56, 15, c.accentDeep)}
      <circle cx="198" cy="158" r="52" fill="${c.accent}"/>
      <circle cx="198" cy="162" r="37" fill="${FUR.cream}"/>
      <circle cx="186" cy="155" r="4.5" fill="${c.ink}"/>
      <circle cx="210" cy="155" r="4.5" fill="${c.ink}"/>
      <ellipse cx="198" cy="176" rx="19" ry="13" fill="${c.paperEdge}"/>
      <path d="M192 172h12l-6 7z" fill="${c.ink}"/>
      <path d="M198 179v5" stroke="${c.ink}" stroke-width="2.5" stroke-linecap="round"/>
      <g>
        <path d="M276 228q-16 4-18 16" stroke="${FUR.mouse}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <ellipse cx="296" cy="226" rx="22" ry="16" fill="${FUR.mouse}"/>
        <circle cx="308" cy="204" r="8" fill="${FUR.mouseDeep}"/>
        <circle cx="314" cy="214" r="11" fill="#c7b09d"/>
        <circle cx="318" cy="212" r="2.6" fill="${c.ink}"/>
      </g>
    </g>`,

  /* ---------------- the hare, and the tortoise plodding past ----------- */
  hare: (c) => `
    <g>
      <g>
        <rect x="74" y="240" width="14" height="14" rx="6" fill="${FUR.greenDeep}"/>
        <rect x="118" y="240" width="14" height="14" rx="6" fill="${FUR.greenDeep}"/>
        <ellipse cx="156" cy="238" rx="16" ry="12" fill="${FUR.green}"/>
        <circle cx="164" cy="234" r="2.8" fill="${c.ink}"/>
        <path d="M62 244a46 32 0 0 1 92 0z" fill="${FUR.greenDeep}"/>
        <path d="M78 244a30 21 0 0 1 60 0z" fill="${FUR.green}"/>
        <path d="M108 216v28M88 226l-6 18M128 226l6 18" stroke="${FUR.greenDeep}"
              stroke-width="3" stroke-linecap="round"/>
      </g>
      <g transform="translate(44 0)">
        <ellipse cx="186" cy="212" rx="52" ry="38" fill="${FUR.cream}"/>
        <circle cx="152" cy="240" r="14" fill="${c.paperEdge}"/>
        <circle cx="240" cy="180" r="28" fill="${FUR.cream}"/>
        <g transform="rotate(-14 236 150)">
          <ellipse cx="236" cy="140" rx="10" ry="34" fill="${FUR.cream}"/>
          <ellipse cx="236" cy="142" rx="4.5" ry="24" fill="${c.tapTint}"/>
        </g>
        <g transform="rotate(10 258 152)">
          <ellipse cx="258" cy="142" rx="10" ry="32" fill="${FUR.cream}"/>
          <ellipse cx="258" cy="144" rx="4.5" ry="22" fill="${c.tapTint}"/>
        </g>
        <circle cx="252" cy="176" r="4.5" fill="${c.ink}"/>
        <path d="M262 186h8" stroke="${c.ink}" stroke-width="2.5" stroke-linecap="round"/>
      </g>
    </g>`,

  /* ---------------- the working ant and the singing grasshopper -------- */
  ant: (c) => `
    <g>
      <g transform="translate(-58 4)">
        <g stroke="${c.ink}" stroke-width="4" stroke-linecap="round">
          <path d="M196 198l-22 26M206 198l-6 30M216 196l20 24"/>
        </g>
        <ellipse cx="164" cy="192" rx="26" ry="22" fill="${c.ink}"/>
        <circle cx="200" cy="192" r="16" fill="${c.inkSoft}"/>
        <circle cx="234" cy="188" r="24" fill="${c.ink}"/>
        <path d="M244 168q6 -18 22 -24M252 176q12 -12 28 -12" stroke="${c.ink}"
              stroke-width="4" fill="none" stroke-linecap="round"/>
        <circle cx="242" cy="182" r="4" fill="${FUR.cream}"/>
        <ellipse cx="128" cy="172" rx="15" ry="20" transform="rotate(-18 128 172)" fill="${c.accent}"/>
      </g>
      <g>
        <path d="M292 212 L318 174 L304 242" stroke="${FUR.greenDeep}" stroke-width="9"
              fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M304 242 L322 252" stroke="${FUR.greenDeep}" stroke-width="5"
              fill="none" stroke-linecap="round"/>
        <path d="M262 224l-6 14M276 228l-4 14" stroke="${FUR.greenDeep}"
              stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="286" cy="214" rx="38" ry="16" transform="rotate(-8 286 214)" fill="${FUR.green}"/>
        <ellipse cx="292" cy="210" rx="26" ry="9" transform="rotate(-8 292 210)" fill="${FUR.greenDeep}"/>
        <circle cx="250" cy="208" r="14" fill="${FUR.green}"/>
        <circle cx="245" cy="204" r="3.6" fill="${c.ink}"/>
        <path d="M240 198q-12 -12 -24 -12M242 202q-14 -4 -26 2" stroke="${FUR.greenDeep}"
              stroke-width="3.2" fill="none" stroke-linecap="round"/>
      </g>
    </g>`,

  /* ---------------- the crow dropping stones in the pitcher ------------ */
  crow: (c) => `
    <g>
      <path d="M150 168h74l-8 84a16 16 0 0 1-16 14h-26a16 16 0 0 1-16-14z" fill="${c.accent}"/>
      <path d="M152 226h70l-4 26a16 16 0 0 1-16 14h-26a16 16 0 0 1-16-14z" fill="${c.accentDeep}"/>
      <rect x="146" y="158" width="70" height="15" rx="7.5" fill="${c.accentDeep}"/>
      <g transform="translate(32 0)">
        <ellipse cx="288" cy="196" rx="46" ry="32" fill="${c.ink}"/>
        <ellipse cx="292" cy="192" rx="28" ry="18" fill="${c.inkSoft}"/>
        <circle cx="264" cy="160" r="24" fill="${c.ink}"/>
        <path d="M242 156l-26 8 26 10z" fill="${c.accentDeep}"/>
        <circle cx="258" cy="154" r="4" fill="${FUR.cream}"/>
        <path d="M276 226v18M300 226v18" stroke="${c.ink}" stroke-width="4" stroke-linecap="round"/>
      </g>
      <circle cx="128" cy="246" r="9" fill="${c.hillDeep}"/>
      <circle cx="150" cy="254" r="7" fill="${c.inkSoft}"/>
      <circle cx="108" cy="256" r="6" fill="${c.hillDeep}"/>
    </g>`,

  /* ---------------- the wolf that finally came ------------------------- */
  wolf: (c) => `
    <g transform="translate(0 12)">
      <path d="M160 152l2-52 42 30z" fill="${c.inkSoft}"/>
      <path d="M244 152l-2-52-42 30z" fill="${c.inkSoft}"/>
      <path d="M170 138l1-30 22 18z" fill="${c.tap}"/>
      <path d="M234 138l-1-30-22 18z" fill="${c.tap}"/>
      <circle cx="202" cy="176" r="48" fill="${c.inkSoft}"/>
      <path d="M202 150q27 6 27 35t-27 35q-27-6-27-35t27-35z" fill="${c.tapTint}"/>
      <circle cx="184" cy="168" r="5" fill="${c.accent}"/>
      <circle cx="220" cy="168" r="5" fill="${c.accent}"/>
      <path d="M195 197h14l-7 8z" fill="${c.ink}"/>
      <path d="M202 205v6" stroke="${c.ink}" stroke-width="2.5" stroke-linecap="round"/>
      <g>
        <path d="M296 242v10M318 242v10" stroke="${c.paperEdge}" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="308" cy="224" rx="28" ry="20" fill="${FUR.cream}"/>
        <circle cx="332" cy="214" r="13" fill="${c.paperEdge}"/>
        <circle cx="336" cy="212" r="2.6" fill="${c.ink}"/>
      </g>
    </g>`,

  /* ---------------- the fox looking up at the grapes ------------------- */
  fox: (c) => `
    <g>
      <g>
        <path d="M306 40v46" stroke="${c.hillDeep}" stroke-width="5" stroke-linecap="round"/>
        <path d="M306 64q-22 -6 -34 6 20 10 34 0z" fill="${c.hillDeep}"/>
        ${grapes(306, 100, c.ink, c.inkSoft)}
      </g>
      <g>
        <path d="M162 232q-54-4-64 26 32 16 64-4z" fill="${FUR.fox}"/>
        <path d="M104 252q22 10 44 2-18-10-44-2z" fill="${FUR.cream}"/>
        <ellipse cx="196" cy="230" rx="48" ry="30" fill="${FUR.fox}"/>
        <path d="M176 246q22 8 44 0-4 18-22 18t-22-18z" fill="${FUR.cream}"/>
        <path d="M222 164l-6 34 26-14z" fill="${FUR.fox}"/>
        <path d="M224 172l-3 20 15-8z" fill="${FUR.foxDeep}"/>
        <path d="M262 158l8 34-26-10z" fill="${FUR.fox}"/>
        <path d="M260 168l5 20-16-6z" fill="${FUR.foxDeep}"/>
        <circle cx="240" cy="196" r="30" fill="${FUR.fox}"/>
        <path d="M256 184q26 4 36 12-12 12-36 12z" fill="${FUR.cream}"/>
        <circle cx="288" cy="196" r="5" fill="${c.ink}"/>
        <circle cx="238" cy="188" r="4.5" fill="${c.ink}"/>
      </g>
    </g>`,
};

/* a ring of little circles - the lion's mane */
function ring(cx, cy, r, size, fill) {
  let out = "";
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * Math.PI * 2;
    out += `<circle cx="${(cx + Math.cos(a) * r).toFixed(1)}" cy="${(
      cy +
      Math.sin(a) * r
    ).toFixed(1)}" r="${size}" fill="${fill}"/>`;
  }
  return out;
}

/* a bunch of grapes */
function grapes(cx, cy, dark, light) {
  const spots = [
    [-30, 0],
    [-10, 0],
    [10, 0],
    [30, 0],
    [-20, 20],
    [0, 20],
    [20, 20],
    [-10, 40],
    [10, 40],
    [0, 58],
  ];
  return spots
    .map(
      ([dx, dy], i) =>
        `<circle cx="${cx + dx}" cy="${cy + dy}" r="13" fill="${
          i % 3 === 0 ? light : dark
        }"/>`,
    )
    .join("");
}

/* the whole scene: sky, sun, hills, creature */
function coverSVG(story) {
  const c = story.theme;
  const motif = MOTIFS[story.motif] ? MOTIFS[story.motif](c) : "";
  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"
               role="img" aria-label="Cover picture for ${escapeAttr(story.title)}"
               preserveAspectRatio="xMidYMid slice">
    <rect width="400" height="300" fill="${c.sky}"/>
    <circle cx="336" cy="58" r="30" fill="${c.accent}" opacity=".5"/>
    <path d="M0 236q60-46 128-16t150-24 122 8v96H0z" fill="${c.hill}" opacity=".85"/>
    ${motif}
    <path d="M0 268q74-30 150-8t250-6v46H0z" fill="${c.hillDeep}"/>
  </svg>`;
}

function escapeAttr(s) {
  return String(s).replace(
    /[&<>"]/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch],
  );
}

/* make the cover drawing reachable from home.js */
if (typeof window !== "undefined") {
  Object.assign(window, { coverSVG, MOTIFS });
}
