  document.addEventListener("DOMContentLoaded", () => {
    const introEl = document.getElementById("intro");
    if (!introEl) return;

    // Skip if already played on this browser
    if (localStorage.getItem("introPlayed") === "true") {
      introEl.remove();
      return;
    }

    // Build the per-letter tspans
    document.documentElement.style.overflow = "hidden";

    const sizeByClass = { small: 13, heavy: 20, Rrrrr: 35 };
    const spacingByClass = { small: 1.4, heavy: 0.55, Rrrrr: 0.45 };

    const svg = document.getElementById("intro-svg");
    const textNodes = Array.from(svg.querySelectorAll("text"));
    const letters = [];

    textNodes.forEach((textEl) => {
      const className = (textEl.getAttribute("class") || "").split(
        /\s+/
      )[0];
      const fontSize = sizeByClass[className] || 16;
      const step = fontSize * (spacingByClass[className] || 0.6);

      const x0 = parseFloat(textEl.getAttribute("x") || 0);
      const y0 = parseFloat(textEl.getAttribute("y") || 0);
      const raw = textEl.textContent;
      textEl.textContent = "";

      let cursorX = x0;
      [...raw].forEach((ch) => {
        const tspan = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "tspan"
        );
        tspan.setAttribute("x", cursorX);
        tspan.setAttribute("y", y0);
        tspan.setAttribute(
          "class",
          (textEl.getAttribute("class") || "") + " intro-letter"
        );
        tspan.textContent = ch;
        textEl.appendChild(tspan);
        letters.push(tspan);

        const extra =
          ch === " " ? step * 0.3 : /[il!.'"]/i.test(ch) ? -step * 0.18 : 0;
        cursorX += step + extra;
      });
    });

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduced) {
      letters.forEach((el) => (el.style.opacity = 1));
      endIntro();
      return;
    }

    gsap.fromTo(
      letters,
      { opacity: 0, y: 6 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.25,
        onComplete: fadeOutIntro,
      }
    );

    function fadeOutIntro() {
      gsap.to(introEl, {
        opacity: 0,
        duration: 0.65,
        delay: 0.6,
        ease: "power2.out",
        onComplete: endIntro,
      });
    }

    function endIntro() {
      introEl.remove();
      document.documentElement.style.overflow = "";
      localStorage.setItem("introPlayed", "true"); // mark as played only after success
    }
  });
