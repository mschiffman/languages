(function () {
  var style = document.createElement("style");
  style.textContent =
    "#sidebar-hamburger{position:fixed;top:16px;left:16px;z-index:1100;background:#343a40;border:none;border-radius:6px;width:42px;height:42px;cursor:pointer;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:5px;padding:8px;}" +
    "#sidebar-hamburger span{display:block;width:22px;height:2px;background:#fff;border-radius:2px;}" +
    "#sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1050;}" +
    "#sidebar-overlay.open{display:block;}" +
    "#sidebar-panel{position:fixed;top:0;left:0;height:100%;width:260px;background:#fff;z-index:1060;transform:translateX(-100%);transition:transform .3s ease;overflow-y:auto;box-shadow:2px 0 12px rgba(0,0,0,.15);}" +
    "#sidebar-panel.open{transform:translateX(0);}" +
    "#sidebar-header{background:#343a40;color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;}" +
    "#sidebar-header h2{margin:0;font-size:1rem;font-weight:600;letter-spacing:.05em;}" +
    "#sidebar-close{background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;line-height:1;padding:0;}" +
    "#sidebar-nav{padding:12px 0;}" +
    ".sidebar-section{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6c757d;padding:10px 20px 4px;margin:0;}" +
    "#sidebar-nav a{display:block;padding:9px 20px;color:#212529;text-decoration:none;font-size:.95rem;transition:background .2s;}" +
    "#sidebar-nav a:hover{background:#f0f0f0;}" +
    "#sidebar-nav a.sidebar-active{font-weight:700;color:#0d6efd;background:#e8f0fe;}" +
    "#sidebar-nav hr{margin:8px 20px;border-color:#dee2e6;}";
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.id = "sidebar-hamburger";
  btn.setAttribute("aria-label", "Open navigation menu");
  btn.innerHTML = "<span></span><span></span><span></span>";
  document.body.appendChild(btn);

  var overlay = document.createElement("div");
  overlay.id = "sidebar-overlay";
  document.body.appendChild(overlay);

  var panel = document.createElement("div");
  panel.id = "sidebar-panel";
  var cur = window.location.pathname.split("/").pop() || "";
  panel.innerHTML =
    '<div id="sidebar-header"><h2>Navigation</h2><button id="sidebar-close" aria-label="Close">&times;</button></div>' +
    '<nav id="sidebar-nav">' +
    '<p class="sidebar-section">General</p>' +
    '<a href="../../sitemap.html">\uD83D\uDDFA\uFE0F Site Map</a>' +
    "<hr>" +
    '<p class="sidebar-section">Everyday Conversations</p>' +
    '<a href="conv1.html"' +
    (cur === "conv1.html" ? ' class="sidebar-active"' : "") +
    ">Dec 28, 2025</a>" +
    '<a href="conv2.html"' +
    (cur === "conv2.html" ? ' class="sidebar-active"' : "") +
    ">Apr 16, 2026</a>" +
    '<a href="conv3.html"' +
    (cur === "conv3.html" ? ' class="sidebar-active"' : "") +
    ">Apr 17, 2026</a>" +
    '<a href="conv4.html"' +
    (cur === "conv4.html" ? ' class="sidebar-active"' : "") +
    ">Apr 18, 2026</a>" +
    '<a href="conv5.html"' +
    (cur === "conv5.html" ? ' class="sidebar-active"' : "") +
    ">Apr 19, 2026</a>" +
    '<a href="conv6.html"' +
    (cur === "conv6.html" ? ' class="sidebar-active"' : "") +
    ">Apr 20, 2026</a>" +
    '<a href="conv7.html"' +
    (cur === "conv7.html" ? ' class="sidebar-active"' : "") +
    ">May 2, 2026</a>" +
    '<a href="conv8.html"' +
    (cur === "conv8.html" ? ' class="sidebar-active"' : "") +
    ">May 8, 2026</a>" +
    '<a href="conv9.html"' +
    (cur === "conv9.html" ? ' class="sidebar-active"' : "") +
    ">May 9, 2026</a>" +
    '<a href="conv10.html"' +
    (cur === "conv10.html" ? ' class="sidebar-active"' : "") +
    ">May 13, 2026</a>" +
    "</nav>";
  document.body.appendChild(panel);

  function openSidebar() {
    panel.classList.add("open");
    overlay.classList.add("open");
  }
  function closeSidebar() {
    panel.classList.remove("open");
    overlay.classList.remove("open");
  }

  btn.addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);
  panel.querySelector("#sidebar-close").addEventListener("click", closeSidebar);
})();
