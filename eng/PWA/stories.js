/* ===================================================================
   THE STORY LIBRARY
   ===================================================================
   Add a story by copying one block below and changing the details.

   pages    : one entry per picture. Each entry is a list of sentences,
              each sentence is a list of [ "text you see", audio number ].
   Audio numbers run 1, 2, 3 ... through the whole story, in the order
   they are read.

   MEDIA for a story with id "lion-mouse" lives in media/lion-mouse/ :
       cover.jpg            the library cover  (optional)
       1.jpg ... 8.jpg      one per page
       01.mp3 ... 24.mp3    one per phrase

   If a file is missing the app still works - you get a friendly
   placeholder instead of a broken page.
   =================================================================== */

const STORIES = [
  /* ----------------------------------------------------------------- */
  {
    id: "lion-mouse",
    title: "The Lion and the Mouse",
    blurb: "A tiny friend keeps a big promise.",
    motif: "lion",
    /* colours drawn from the story's forest world */
    theme: {
      paper: "#f1f6ea",
      paperEdge: "#e3edd6",
      ink: "#274b2f",
      inkSoft: "#3c6b45",
      tap: "#8fc07e",
      tapTint: "#e4f0d8",
      accent: "#f6b93b",
      accentDeep: "#e39b12",
      sky: "#dfeecb",
      hill: "#8fc07e",
      hillDeep: "#4f8a54",
    },
    pages: [
      {
        img: 1,
        sentences: [
          [
            ["A lion was sleeping", 1],
            ["in the forest.", 2],
          ],
          [
            ["A little mouse", 3],
            ["ran over his paw.", 4],
          ],
        ],
      },
      {
        img: 2,
        sentences: [[["The lion woke up.", 5]], [["He caught the mouse.", 6]]],
      },
      {
        img: 3,
        sentences: [
          [
            ['"Please let me go,"', 7],
            ["said the mouse.", 8],
          ],
          [
            ['"One day,', 9],
            ['I can help you."', 10],
          ],
        ],
      },
      {
        img: 4,
        sentences: [
          [
            ["The lion laughed but", 11],
            ["he let the mouse go.", 12],
          ],
        ],
      },
      {
        img: 5,
        sentences: [
          [
            ["Later, the lion was caught", 13],
            ["in a hunter's net.", 14],
          ],
        ],
      },
      {
        img: 6,
        sentences: [
          [
            ["The mouse heard", 15],
            ["the lion roar.", 16],
          ],
          [["He ran to help.", 17]],
        ],
      },
      {
        img: 7,
        sentences: [
          [
            ["The mouse bit the ropes", 18],
            ["with his sharp teeth.", 19],
          ],
          [["Soon the lion was free.", 20]],
        ],
      },
      {
        img: 8,
        sentences: [
          [
            ["The lion said,", 21],
            ['"Thank you, little mouse."', 22],
          ],
          [
            ["Even a small friend", 23],
            ["can help a big friend.", 24],
          ],
        ],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  {
    id: "tortoise-hare",
    title: "The Tortoise and the Hare",
    blurb: "The slow one keeps going.",
    motif: "hare",
    theme: {
      paper: "#eef4f8",
      paperEdge: "#dce8f0",
      ink: "#1f4257",
      inkSoft: "#356981",
      tap: "#7fb6cf",
      tapTint: "#dbeaf2",
      accent: "#f0a04b",
      accentDeep: "#d5802a",
      sky: "#d6e8f2",
      hill: "#9fc9a0",
      hillDeep: "#4e8a63",
    },
    pages: [
      {
        img: 1,
        sentences: [
          [
            ["The hare could run", 1],
            ["very fast.", 2],
          ],
          [
            ["He laughed at", 3],
            ["the slow tortoise.", 4],
          ],
        ],
      },
      {
        img: 2,
        sentences: [
          [
            ['"Let us race,"', 5],
            ["said the tortoise.", 6],
          ],
          [["The hare said yes.", 7]],
        ],
      },
      {
        img: 3,
        sentences: [
          [
            ["The race began.", 8],
            ["The hare ran far ahead.", 9],
          ],
        ],
      },
      {
        img: 4,
        sentences: [
          [
            ["The hare sat down", 10],
            ["under a tree.", 11],
          ],
          [["Soon he fell asleep.", 12]],
        ],
      },
      {
        img: 5,
        sentences: [
          [
            ["The tortoise walked on.", 13],
            ["Step after step.", 14],
          ],
        ],
      },
      {
        img: 6,
        sentences: [
          [
            ["The tortoise passed", 15],
            ["the sleeping hare.", 16],
          ],
          [["He won the race!", 17]],
        ],
      },
      {
        img: 7,
        sentences: [
          [
            ["Slow and steady", 18],
            ["wins the race.", 19],
          ],
        ],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  {
    id: "ant-grasshopper",
    title: "The Ant and the Grasshopper",
    blurb: "Work first, then play.",
    motif: "ant",
    theme: {
      paper: "#f8f3e4",
      paperEdge: "#eee4cc",
      ink: "#5a3a1b",
      inkSoft: "#7d572c",
      tap: "#d9b169",
      tapTint: "#f2e6cb",
      accent: "#8fb339",
      accentDeep: "#6f8f26",
      sky: "#f5e9cc",
      hill: "#d9c37a",
      hillDeep: "#9a7c3a",
    },
    pages: [
      {
        img: 1,
        sentences: [
          [
            ["All summer the ant", 1],
            ["carried food home.", 2],
          ],
        ],
      },
      {
        img: 2,
        sentences: [
          [
            ["The grasshopper sang", 3],
            ["and danced all day.", 4],
          ],
        ],
      },
      {
        img: 3,
        sentences: [
          [
            ['"Come and play,"', 5],
            ["said the grasshopper.", 6],
          ],
          [
            ['"I must work,"', 7],
            ["said the ant.", 8],
          ],
        ],
      },
      {
        img: 4,
        sentences: [
          [
            ["Then winter came.", 9],
            ["Snow covered the fields.", 10],
          ],
        ],
      },
      {
        img: 5,
        sentences: [
          [
            ["The grasshopper had", 11],
            ["no food to eat.", 12],
          ],
        ],
      },
      {
        img: 6,
        sentences: [
          [
            ["He knocked on", 13],
            ["the ant's door.", 14],
          ],
        ],
      },
      {
        img: 7,
        sentences: [
          [["The ant shared her food.", 15]],
          [
            ["Now the grasshopper works", 16],
            ["in the summer too.", 17],
          ],
        ],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  {
    id: "crow-pitcher",
    title: "The Crow and the Pitcher",
    blurb: "A clever bird finds a way.",
    motif: "crow",
    theme: {
      paper: "#f4f1ec",
      paperEdge: "#e6e0d6",
      ink: "#3b3a45",
      inkSoft: "#5c5a6b",
      tap: "#a3aab8",
      tapTint: "#e6e7ec",
      accent: "#b0603a",
      accentDeep: "#8e4a2b",
      sky: "#e2e6ea",
      hill: "#bfb3a2",
      hillDeep: "#82705c",
    },
    pages: [
      {
        img: 1,
        sentences: [
          [
            ["A thirsty crow", 1],
            ["looked for water.", 2],
          ],
        ],
      },
      {
        img: 2,
        sentences: [
          [
            ["She found a pitcher", 3],
            ["with a little water inside.", 4],
          ],
        ],
      },
      {
        img: 3,
        sentences: [
          [
            ["Her beak could not", 5],
            ["reach the water.", 6],
          ],
        ],
      },
      {
        img: 4,
        sentences: [
          [
            ["The crow saw", 7],
            ["some small stones.", 8],
          ],
        ],
      },
      {
        img: 5,
        sentences: [
          [
            ["She dropped them in,", 9],
            ["one by one.", 10],
          ],
          [["The water came up.", 11]],
        ],
      },
      {
        img: 6,
        sentences: [
          [
            ["The crow drank", 12],
            ["and flew away.", 13],
          ],
          [
            ["Good thinking can", 14],
            ["solve a big problem.", 15],
          ],
        ],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  {
    id: "boy-wolf",
    title: "The Boy Who Cried Wolf",
    blurb: "What happens when no one believes you.",
    motif: "wolf",
    theme: {
      paper: "#f2eef6",
      paperEdge: "#e4dced",
      ink: "#3d2d55",
      inkSoft: "#5c4679",
      tap: "#a68cc4",
      tapTint: "#e7dff2",
      accent: "#f2a65a",
      accentDeep: "#d1813a",
      sky: "#e3daf0",
      hill: "#9dbb86",
      hillDeep: "#5c7a4a",
    },
    pages: [
      {
        img: 1,
        sentences: [
          [
            ["A boy watched", 1],
            ["the sheep on the hill.", 2],
          ],
        ],
      },
      {
        img: 2,
        sentences: [
          [
            ["He was bored,", 3],
            ["so he shouted.", 4],
          ],
          [['"Wolf! Wolf!"', 5]],
        ],
      },
      {
        img: 3,
        sentences: [
          [
            ["The people ran up the hill", 6],
            ["to help him.", 7],
          ],
          [["There was no wolf.", 8]],
        ],
      },
      {
        img: 4,
        sentences: [
          [["The boy laughed at them.", 9]],
          [
            ["The next day,", 10],
            ["he did it again.", 11],
          ],
        ],
      },
      {
        img: 5,
        sentences: [
          [["Then a real wolf came.", 12]],
          [
            ['"Wolf! Wolf!"', 13],
            ["cried the boy.", 14],
          ],
        ],
      },
      {
        img: 6,
        sentences: [
          [
            ["But nobody came", 15],
            ["to help him.", 16],
          ],
        ],
      },
      {
        img: 7,
        sentences: [
          [
            ["No one believes a boy", 17],
            ["who tells lies.", 18],
          ],
        ],
      },
    ],
  },

  /* ----------------------------------------------------------------- */
  {
    id: "fox-grapes",
    title: "The Fox and the Grapes",
    blurb: "If you cannot have it, is it still sweet?",
    motif: "fox",
    theme: {
      paper: "#f7eef2",
      paperEdge: "#ecdde4",
      ink: "#4a2340",
      inkSoft: "#6d3b5f",
      tap: "#c48aa8",
      tapTint: "#f0dde6",
      accent: "#8bb04f",
      accentDeep: "#6c8c39",
      sky: "#efdfe7",
      hill: "#a8bf72",
      hillDeep: "#6b8340",
    },
    pages: [
      {
        img: 1,
        sentences: [
          [
            ["A hungry fox saw", 1],
            ["grapes on a vine.", 2],
          ],
        ],
      },
      {
        img: 2,
        sentences: [
          [
            ["They were high", 3],
            ["above his head.", 4],
          ],
        ],
      },
      {
        img: 3,
        sentences: [
          [
            ["He jumped up.", 5],
            ["He could not reach them.", 6],
          ],
        ],
      },
      {
        img: 4,
        sentences: [
          [
            ["He jumped again", 7],
            ["and again.", 8],
          ],
        ],
      },
      {
        img: 5,
        sentences: [
          [
            ["At last, the fox", 9],
            ["walked away.", 10],
          ],
        ],
      },
      {
        img: 6,
        sentences: [
          [
            ['"Those grapes are sour,"', 11],
            ["he said.", 12],
          ],
          [
            ["It is easy to say no", 13],
            ["to what you cannot have.", 14],
          ],
        ],
      },
    ],
  },
];

/* ---- helpers shared by the home page, the reader and the worker ---- */

const IMG_EXT = "jpg";
const AUD_EXT = "mp3";

const pad2 = (n) => String(n).padStart(2, "0");

function storyById(id) {
  return STORIES.find((s) => s.id === id) || null;
}

/* every phrase in reading order */
function chunksOf(story) {
  const out = [];
  story.pages.forEach((p) =>
    p.sentences.forEach((s) => s.forEach((c) => out.push(c))),
  );
  return out;
}

/* every media file a story needs, for the offline download */
function mediaUrlsOf(story) {
  const dir = `media/${story.id}/`;
  const urls = [`${dir}cover.${IMG_EXT}`];
  story.pages.forEach((p) => urls.push(`${dir}${p.img}.${IMG_EXT}`));
  chunksOf(story).forEach(([, n]) => urls.push(`${dir}${pad2(n)}.${AUD_EXT}`));
  return urls;
}

/* make everything reachable from the other scripts */
if (typeof window !== "undefined") {
  Object.assign(window, {
    STORIES,
    IMG_EXT,
    AUD_EXT,
    pad2,
    storyById,
    chunksOf,
    mediaUrlsOf,
  });
}
