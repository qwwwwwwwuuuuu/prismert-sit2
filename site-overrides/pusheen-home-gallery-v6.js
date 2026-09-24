(() => {
  const buildStorySection = (dataSection) => {
    const section = document.createElement("section");
    section.className = "pusheen-room-section pusheen-room-section--data";
    section.dataset.pusheenStory = "true";
    section.setAttribute("aria-label", "PUSHIN market data");

    dataSection.className = "pusheen-story-copy";
    section.append(dataSection);

    return section;
  };

  const mountMathsRunner = (container) => {
    const heading = Array.from(container.querySelectorAll("h2"))
      .find((node) => node.textContent.trim() === "The maths, the limits and the schemas are written down");
    const section = heading?.closest("section");
    if (!section) return;

    section.classList.remove(
      "pusheen-room-section--data",
      "pusheen-room-section--analysis",
      "pusheen-room-section--settlement",
      "pusheen-room-section--docs"
    );
    section.classList.add("pusheen-room-section", "pusheen-room-section--runner");
    section.removeAttribute("data-room-scene");
    section.dataset.pushinMathsRunner = "true";


  };

  const decorateRoomSections = (sections) => {
    const scenes = [
      [sections[2], "analysis"],
      [sections[3], "settlement"],
      [sections[4], "analysis"],
      [sections[5], "docs"],
      [sections[6], "settlement"],
      [sections[7], "docs"]
    ];

    scenes.forEach(([section, scene]) => {
      if (!section) return;
      section.classList.add("pusheen-room-section", `pusheen-room-section--${scene}`);
      section.dataset.roomScene = scene;
    });
  };

  const collapseEmptyMarket = (hero) => {
    const exactText = (value) => Array.from(hero.querySelectorAll("div, td"))
      .find((node) => node.children.length === 0 && node.textContent.trim() === value);

    const chartMessage = exactText("Preparing the chart");
    if (chartMessage) chartMessage.parentElement.hidden = true;

    const pricesMessage = exactText("No price observations yet");
    if (pricesMessage) {
      const table = pricesMessage.closest(".overflow-x-auto");
      if (table) table.hidden = true;
    }

    const fade = hero.querySelector(".pointer-events-none.absolute.inset-x-0.bottom-0");
    if (fade) fade.hidden = true;
  };

  const placeSideArtwork = (container) => {
    const scenes = {
      "Priced from public venue data": "data",
      "Both markets, as they stand": "settlement"
    };
    container.querySelectorAll('h2').forEach(heading => {
      const section = heading.closest('section');
      if (heading.textContent.trim() === 'Open the terminal') {
        section.classList.add('pushin-no-cats');
      }
      const scene = scenes[heading.textContent.trim()];
      if (!scene) return;
      const room = section.closest('.pusheen-room-section');
      room.classList.add('pushin-side-art');
      room.style.setProperty('--pushin-side-image', `url("/brand/pusheen-${scene}-cutout.png")`);
      ['left','right'].forEach(side => {
        const art = document.createElement('span');
        art.className = `pushin-side-cat pushin-side-cat--${side}`;
        art.setAttribute('aria-hidden','true');
        room.append(art);
      });
    });
  };

  const mount = () => {
    if (document.querySelector("[data-pusheen-story]")) return;

    const container = document.querySelector("main > div > div");
    if (!container) return;

    const sections = Array.from(container.children).filter((node) => node.tagName === "SECTION");
    if (sections.length < 5) return;

    const hero = sections[0];
    document.body.classList.add("pusheen-home");
    hero.classList.add("prism-hero");
    collapseEmptyMarket(hero);

    hero.after(buildStorySection(sections[1]));
    decorateRoomSections(sections);
    mountMathsRunner(container);
    placeSideArtwork(container);
  };

  window.addEventListener("load", () => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(mount));
  }, { once: true });
})();
