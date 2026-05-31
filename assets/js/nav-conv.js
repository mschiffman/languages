(function () {
  var style = document.createElement("style");
  style.textContent =
    "#sidebar-hamburger{position:fixed;top:16px;left:16px;z-index:1100;background:#343a40;border:none;border-radius:6px;width:42px;height:42px;cursor:pointer;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:5px;padding:8px;}" +
    "#sidebar-hamburger span{display:block;width:22px;height:2px;background:#fff;border-radius:2px;}" +
    "#sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1050;}" +
    "#sidebar-overlay.open{display:block;}" +
    "#sidebar-panel{position:fixed;top:0;left:0;height:100%;width:260px;background:#fff;z-index:1060;transform:translateX(-100%);transition:transform .3s ease;display:flex;flex-direction:column;box-shadow:2px 0 12px rgba(0,0,0,.15);}" +
    "#sidebar-panel.open{transform:translateX(0);}" +
    "#sidebar-header{background:#343a40;color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;}" +
    "#sidebar-header h2{margin:0;font-size:1rem;font-weight:600;letter-spacing:.05em;}" +
    "#sidebar-close{background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;line-height:1;padding:0;}" +
    "#sidebar-nav{padding:12px 0;overflow-y:auto;flex:1;}" +
    ".sidebar-section{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6c757d;padding:10px 20px 4px;margin:0;}" +
    "#sidebar-nav .sidebar-general-link{display:block;padding:8px 20px;color:#212529;text-decoration:none;font-size:.92rem;transition:background .2s;}" +
    "#sidebar-nav .sidebar-general-link:hover{background:#f0f0f0;}" +
    "#sidebar-nav hr{margin:8px 20px;border-color:#dee2e6;}" +
    ".sb-year-toggle{display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;font-size:.82rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#343a40;padding:10px 20px 6px;margin:0;border-top:1px solid #dee2e6;}" +
    ".sb-year-toggle:first-of-type{border-top:none;}" +
    ".sb-arrow{display:inline-block;font-size:.6rem;color:#6c757d;transition:transform .2s;line-height:1;}" +
    ".sb-year-toggle.open .sb-arrow{transform:rotate(90deg);}" +
    ".sb-year-body{display:none;}" +
    ".sb-year-body.open{display:block;}" +
    ".sb-month-toggle{display:flex;align-items:center;gap:5px;cursor:pointer;user-select:none;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6c757d;padding:6px 20px 4px 28px;margin:0;}" +
    ".sb-month-toggle .sb-arrow{font-size:.55rem;}" +
    ".sb-month-toggle.open .sb-arrow{transform:rotate(90deg);}" +
    ".sb-month-body{display:none;}" +
    ".sb-month-body.open{display:block;}" +
    "#sidebar-nav a.sb-conv-link{display:block;padding:7px 20px 7px 40px;color:#212529;text-decoration:none;font-size:.92rem;transition:background .2s;}" +
    "#sidebar-nav a.sb-conv-link:hover{background:#f0f0f0;}" +
    "#sidebar-nav a.sb-conv-link.sidebar-active{font-weight:700;color:#0d6efd;background:#e8f0fe;}";
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.id = "sidebar-hamburger";
  btn.setAttribute("aria-label", "Open navigation menu");
  btn.innerHTML = "<span></span><span></span><span></span>";
  document.body.appendChild(btn);

  var overlay = document.createElement("div");
  overlay.id = "sidebar-overlay";
  document.body.appendChild(overlay);

  var convs = [
    {
      href: "conv1.html",
      label: "Dec 28 - Jeu de rôle - La journée d'hier",
      year: "2025",
      month: "December",
    },
    {
      href: "conv2.html",
      label: "Apr 16 - Ce qu'on aime et n'aime pas",
      year: "2026",
      month: "April",
    },
    {
      href: "conv3.html",
      label: "Apr 17 - Un après-midi au jardin",
      year: "2026",
      month: "April",
    },
    {
      href: "conv4.html",
      label: "Apr 18 - Je suis originaire de Birmanie",
      year: "2026",
      month: "April",
    },
    {
      href: "conv5.html",
      label: "Apr 19 - Les restrictions d'eau",
      year: "2026",
      month: "April",
    },
    {
      href: "conv6.html",
      label: "Apr 20 - La vieillesse et les maisons de retraite",
      year: "2026",
      month: "April",
    },
    {
      href: "conv7.html",
      label: "May 2 - Jeu de rôle - Un mari malade",
      year: "2026",
      month: "May",
    },
    {
      href: "conv8.html",
      label: "May 8 - Je fais des pâtes",
      year: "2026",
      month: "May",
    },
    {
      href: "conv9.html",
      label: "May 9 - On sort au cinéma",
      year: "2026",
      month: "May",
    },
    {
      href: "conv10.html",
      label: "May 13 - Une maison de retraite en Thaïlande",
      year: "2026",
      month: "May",
    },
    {
      href: "conv11.html",
      label: "May 20 - Une maison de retraite en Thaïlande",
      year: "2026",
      month: "May",
    },
    {
      href: "conv12.html",
      label: "May 21 - Chez le dentiste",
      year: "2026",
      month: "May",
    },
    {
      href: "conv13.html",
      label: "May 22 - À la pharmacie",
      year: "2026",
      month: "May",
    },
    {
      href: "conv14.html",
      label: "May 27 - Entre amies",
      year: "2026",
      month: "May",
    },
    {
      href: "conv15.html",
      label: "May 30 - Loisirs et retraite",
      year: "2026",
      month: "May",
    },
    {
      href: "conv16.html",
      label: "May 31 - Le jardin et le petit-déjeuner",
      year: "2026",
      month: "May",
    },
  ];

  var cur = window.location.pathname.split("/").pop() || "";

  // Build grouped structure: { year -> { month -> [convs] } }
  var groups = [];
  var yearMap = {};
  for (var i = 0; i < convs.length; i++) {
    var c = convs[i];
    if (!yearMap[c.year]) {
      yearMap[c.year] = { year: c.year, months: [], monthMap: {} };
      groups.push(yearMap[c.year]);
    }
    var yg = yearMap[c.year];
    if (!yg.monthMap[c.month]) {
      yg.monthMap[c.month] = { month: c.month, convs: [] };
      yg.months.push(yg.monthMap[c.month]);
    }
    yg.monthMap[c.month].convs.push(c);
  }

  // Build nav HTML — all collapsed by default
  var navHTML =
    '<p class="sidebar-section">General</p>' +
    '<a class="sidebar-general-link" href="../../sitemap.html">🗺️ Site Map</a>' +
    "<hr>" +
    '<p class="sidebar-section">Everyday Conversations</p>';

  for (var gi = 0; gi < groups.length; gi++) {
    var yg = groups[gi];
    navHTML +=
      '<p class="sb-year-toggle" data-target="sb-y-' +
      yg.year +
      '">' +
      '<span class="sb-arrow">&#9654;</span>' +
      yg.year +
      "</p>" +
      '<div class="sb-year-body" id="sb-y-' +
      yg.year +
      '">';

    for (var mi = 0; mi < yg.months.length; mi++) {
      var mg = yg.months[mi];
      navHTML +=
        '<p class="sb-month-toggle" data-target="sb-m-' +
        yg.year +
        "-" +
        mg.month +
        '">' +
        '<span class="sb-arrow">&#9654;</span>' +
        mg.month +
        "</p>" +
        '<div class="sb-month-body" id="sb-m-' +
        yg.year +
        "-" +
        mg.month +
        '">';

      for (var ci = 0; ci < mg.convs.length; ci++) {
        var c = mg.convs[ci];
        navHTML +=
          '<a class="sb-conv-link' +
          (cur === c.href ? " sidebar-active" : "") +
          '" href="' +
          c.href +
          '">' +
          c.label +
          "</a>";
      }
      navHTML += "</div>";
    }
    navHTML += "</div>";
  }

  var panel = document.createElement("div");
  panel.id = "sidebar-panel";
  panel.innerHTML =
    '<div id="sidebar-header"><h2>Navigation</h2><button id="sidebar-close" aria-label="Close">&times;</button></div>' +
    '<nav id="sidebar-nav">' +
    navHTML +
    "</nav>";
  document.body.appendChild(panel);

  var SK = "sb_state";

  function saveState() {
    var openYT = panel.querySelector(".sb-year-toggle.open");
    var openMT = panel.querySelector(".sb-month-toggle.open");
    sessionStorage.setItem(
      SK,
      JSON.stringify({
        panelOpen: panel.classList.contains("open"),
        year: openYT ? openYT.getAttribute("data-target") : null,
        month: openMT ? openMT.getAttribute("data-target") : null,
      }),
    );
  }

  function restoreState() {
    try {
      var s = JSON.parse(sessionStorage.getItem(SK));
      if (!s) return;
      if (s.panelOpen) {
        panel.classList.add("open");
        overlay.classList.add("open");
      }
      if (s.year) {
        var yt = panel.querySelector('[data-target="' + s.year + '"]');
        if (yt) {
          yt.classList.add("open");
          var yb = document.getElementById(s.year);
          if (yb) yb.classList.add("open");
        }
      }
      if (s.month) {
        var mt = panel.querySelector('[data-target="' + s.month + '"]');
        if (mt) {
          mt.classList.add("open");
          var mb = document.getElementById(s.month);
          if (mb) mb.classList.add("open");
        }
      }
    } catch (e) {}
  }

  // Accordion toggle handlers
  panel.querySelector("#sidebar-nav").addEventListener("click", function (e) {
    var toggle = e.target.closest(".sb-year-toggle, .sb-month-toggle");
    if (!toggle) return;
    var isYear = toggle.classList.contains("sb-year-toggle");
    var isAlreadyOpen = toggle.classList.contains("open");

    if (isYear) {
      // Close all years and their months
      var allYearToggles = panel.querySelectorAll(".sb-year-toggle");
      for (var i = 0; i < allYearToggles.length; i++) {
        var yt = allYearToggles[i];
        yt.classList.remove("open");
        document
          .getElementById(yt.getAttribute("data-target"))
          .classList.remove("open");
      }
      // Close all months inside all years
      var allMonthToggles = panel.querySelectorAll(".sb-month-toggle");
      for (var i = 0; i < allMonthToggles.length; i++) {
        var mt = allMonthToggles[i];
        mt.classList.remove("open");
        document
          .getElementById(mt.getAttribute("data-target"))
          .classList.remove("open");
      }
      // Open clicked year (unless it was already open — clicking again collapses)
      if (!isAlreadyOpen) {
        toggle.classList.add("open");
        document
          .getElementById(toggle.getAttribute("data-target"))
          .classList.add("open");
      }
    } else {
      // Close all months across the whole nav
      var allMonthToggles = panel.querySelectorAll(".sb-month-toggle");
      for (var i = 0; i < allMonthToggles.length; i++) {
        var mt = allMonthToggles[i];
        mt.classList.remove("open");
        document
          .getElementById(mt.getAttribute("data-target"))
          .classList.remove("open");
      }
      // Open clicked month (unless it was already open)
      if (!isAlreadyOpen) {
        toggle.classList.add("open");
        document
          .getElementById(toggle.getAttribute("data-target"))
          .classList.add("open");
      }
    }
    saveState();
  });

  function openSidebar() {
    panel.classList.add("open");
    overlay.classList.add("open");
    saveState();
  }
  function closeSidebar() {
    panel.classList.remove("open");
    overlay.classList.remove("open");
    saveState();
  }

  btn.addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);
  panel.querySelector("#sidebar-close").addEventListener("click", closeSidebar);

  restoreState();
})();
