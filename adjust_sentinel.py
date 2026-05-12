import re
from pathlib import Path

path = Path("comedy.html")
text = path.read_text(encoding="utf-8").replace("\r\n", "\n")

create_pattern = re.compile(
    r"        function createSentinel\(container\) {\n(?:.*\n)*?          return el;\n        }\n",
    re.DOTALL,
)

new_create = (
    "        function createSentinel(container) {\n"
    "          const el = document.createElement(\"div\");\n"
    "          el.id = \"episode-sentinel\";\n"
    "          el.className = \"load-more-sentinel\";\n"
    "          el.setAttribute(\"aria-hidden\", \"true\");\n"
    "          el.style.width = \"100%\";\n"
    "          el.style.height = \"1px\";\n"
    "          el.style.margin = \"0\";\n"
    "          el.style.opacity = \"0\";\n"
    "          el.style.overflow = \"hidden\";\n"
    "          el.style.pointerEvents = \"none\";\n"
    "          container.appendChild(el);\n"
    "          return el;\n"
    "        }\n"
)

if not create_pattern.search(text):
    raise SystemExit("createSentinel block not found")

text = create_pattern.sub(new_create, text, count=1)

loading_pattern = re.compile(
    r"                if \(sentinel\) {\n(?:.*\n)*?                const filteredEpisodes = getFilteredEpisodes\(currentTopic\);\n",
    re.DOTALL,
)

new_loading = (
    "                if (observer && sentinel) {\n"
    "                  observer.unobserve(sentinel);\n"
    "                }\n\n"
    "                const filteredEpisodes = getFilteredEpisodes(currentTopic);\n"
)

text, count = loading_pattern.subn(new_loading, text, count=1)
if count != 1:
    raise SystemExit("loading block replacement failed")

render_pattern = re.compile(
    r"          if \(sentinel\) {\n(?:.*\n)*?          }\n\n          if \(window\.AOS\) {",
    re.DOTALL,
)

new_render = (
    "          if (sentinel) {\n"
    "            const hasMoreToLoad =\n"
    "              filteredEpisodes.length > visibleEpisodes.length;\n\n"
    "            if (hasMoreToLoad) {\n"
    "              sentinel.style.display = \"\";\n\n"
    "              if (observer) {\n"
    "                observer.observe(sentinel);\n"
    "              }\n"
    "            } else {\n"
    "              sentinel.style.display = \"none\";\n\n"
    "              if (observer) {\n"
    "                observer.unobserve(sentinel);\n"
    "              }\n"
    "            }\n"
    "          }\n\n"
    "          if (window.AOS) {"
)

text, count = render_pattern.subn(new_render, text, count=1)
if count != 1:
    raise SystemExit("render block replacement failed")

path.write_text(text.replace("\n", "\r\n"), encoding="utf-8")
