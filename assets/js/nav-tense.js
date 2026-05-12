// Populate the grammar sidebar navigation and highlight the active page.
(() => {
  const sidebarAccordion = document.getElementById("sidebar-accordion");
  if (!sidebarAccordion) {
    return;
  }

  const grammarPageMap = {
    "index.html": "overview",
    "": "overview",
    "present.html": "present",
    "passe.html": "passe",
    "imparfait.html": "imparfait",
    "future.html": "future",
    "conditionnel.html": "conditionnel",
    "subjonctif.html": "subjonctif",
    "plus-que-parfait.html": "plus-que-parfait",
    "exercice.html": "exercice",
    "fc-present.html": "flashcard",
  };

  const navItems = [
    {
      type: "link",
      label: "Home",
      href: "../../index.html",
      icon: "bi-house-door",
      classes: "d-flex align-items-center gap-2",
    },
    {
      type: "collapse",
      id: "grammarLinks",
      label: "French Grammar",
      icon: "bi-journal-text",
      buttonClasses: "d-flex align-items-center justify-content-between",
      items: [
        {
          type: "link",
          label: "Grammar Main",
          icon: "bi-clipboard-data",
          classes:
            "d-flex align-items-center gap-2 bg-secondary text-white rounded-1",
          href: "../index.html",
        },
        {
          type: "collapse",
          id: "tensesLinks",
          label: "French Tenses",
          icon: "bi-clock-history",
          buttonClasses: "d-flex align-items-center justify-content-between",
          items: [
            {
              type: "link",
              id: "overview",
              label: "Tenses Overview",
              href: "index.html",
            },
            {
              type: "link",
              id: "present",
              label: "Pr&eacute;sent",
              href: "present.html",
            },
            {
              type: "link",
              id: "passe",
              label: "Pass&eacute; compos&eacute;",
              href: "passe.html",
            },
            {
              type: "link",
              id: "imparfait",
              label: "Imparfait",
              href: "imparfait.html",
            },
            {
              type: "link",
              id: "future",
              label: "Futur proche",
              href: "future.html",
            },
            {
              type: "link",
              id: "conditionnel",
              label: "Conditionnel pr&eacute;sent",
              href: "conditionnel.html",
            },
            {
              type: "link",
              id: "subjonctif",
              label: "Subjonctif pr&eacute;sent",
              href: "subjonctif.html",
            },
            {
              type: "link",
              id: "plus-que-parfait",
              label: "plus-que-parfait",
              href: "plus-que-parfait.html",
            },
            {
              type: "link",
              id: "exercice",
              label: "Exercice",
              href: "exercice.html",
            },
            {
              type: "link",
              id: "flashcard",
              label: "flashcard",
              href: "fc-present.html",
            },
          ],
        },
      ],
    },
    {
      type: "collapse",
      id: "resourcesLinks",
      label: "French Resources",
      icon: "bi-collection",
      buttonClasses: "d-flex align-items-center justify-content-between",
      items: [
        { label: "French Main", href: "../../../french.html" },
        { label: "French Expressions", href: "../../expression/archive.html" },
        {
          label: "French Pronunciation",
          href: "../../pron/RFI260202/index.html",
        },
        { label: "French Enunciation", href: "../../enunciation/r/index.html" },
        { label: "Reading Practice", href: "../../reading/index.html" },
        { label: "French Jokes", href: "../../../comedy/index.html" },
      ],
    },
  ];

  const currentPath = window.location.pathname.replace(/\\/g, "/");
  const segments = currentPath.split("/").filter(Boolean);
  let currentFile = segments.pop() || "";
  if (!currentFile && currentPath.endsWith("/")) {
    currentFile = "index.html";
  }
  const currentPageId = grammarPageMap[currentFile] || null;

  const hasActiveItem = (item) => {
    if (item.id && item.id === currentPageId) {
      return true;
    }
    if (Array.isArray(item.items)) {
      return item.items.some((child) => hasActiveItem(child));
    }
    return false;
  };

  const createLink = (item, isActive = false) => {
    const baseClasses = ["list-group-item", "list-group-item-action"];
    if (item.classes) {
      baseClasses.push(item.classes);
    }
    if (isActive) {
      baseClasses.push("active");
    }

    const content = item.icon
      ? `<i class="bi ${item.icon}"></i><span>${item.label}</span>`
      : item.label;

    const ariaCurrent = isActive ? ' aria-current="page"' : "";

    return `<a class="${baseClasses.join(" ")}" href="${item.href}"${ariaCurrent}>${content}</a>`;
  };

  const createCollapse = (item, parentSelector = "#sidebar-accordion") => {
    const anyActive = hasActiveItem(item);
    const buttonClasses = ["list-group-item", "list-group-item-action"];
    if (item.buttonClasses) {
      buttonClasses.push(item.buttonClasses);
    }

    const iconMarkup = item.icon ? `<i class="bi ${item.icon}"></i>` : "";
    const button = `<button class="${buttonClasses.join(" ")}" data-bs-toggle="collapse" data-bs-target="#${item.id}" aria-expanded="${anyActive}" aria-controls="${item.id}">
      <span class="d-flex align-items-center gap-2">${iconMarkup ? `${iconMarkup} ` : ""}${item.label}</span>
      <i class="bi bi-caret-down"></i>
    </button>`;

    const innerLinks = renderNavItems(item.items || [], `#${item.id}`);

    const collapseClasses = ["collapse", "ps-4"];
    if (anyActive) {
      collapseClasses.push("show");
    }

    const parentAttr = parentSelector
      ? ` data-bs-parent="${parentSelector}"`
      : "";
    return `${button}
    <div id="${item.id}" class="${collapseClasses.join(" ")}"${parentAttr}>
      ${innerLinks}
    </div>`;
  };

  const renderNavItems = (items, parentSelector = "#sidebar-accordion") =>
    items
      .map((item) => {
        if (item.type === "collapse") {
          return createCollapse(item, parentSelector);
        }
        const isActive = item.id && item.id === currentPageId;
        return createLink(item, isActive);
      })
      .join("\n\n");

  const markup = renderNavItems(navItems);

  sidebarAccordion.innerHTML = markup;
})();
