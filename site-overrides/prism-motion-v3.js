(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const protocolStats = [
    { value: 3, suffix: "", label: "Derivative markets" },
    { value: 15, suffix: "s", label: "Reference feed interval" },
    { value: 8, suffix: "×", label: "Payout ceiling" },
    { value: 20, suffix: "%", label: "Per-block oracle limit" }
  ];

  const animateCounter = (node) => {
    if (!node || node.dataset.counted === "true") return;
    node.dataset.counted = "true";
    const target = Number(node.dataset.target || 0);
    const suffix = node.dataset.suffix || "";

    if (reduceMotion) {
      node.textContent = `${target}${suffix}`;
      return;
    }

    const started = performance.now();
    const duration = 1050;
    const frame = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      node.textContent = `${Math.round(target * eased)}${suffix}`;
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const mountProtocolCarousel = () => {
    const header = document.querySelector("header.sticky");
    if (!header || document.querySelector("[data-prism-motion-rail]")) return;

    const rail = document.createElement("aside");
    rail.className = "prism-motion-rail";
    rail.dataset.prismMotionRail = "true";
    rail.setAttribute("aria-label", "PUSHIN protocol figures");

    const viewport = document.createElement("div");
    viewport.className = "prism-motion-viewport";
    const track = document.createElement("div");
    track.className = "prism-motion-track";

    protocolStats.forEach((stat, index) => {
      const slide = document.createElement("div");
      slide.className = "prism-motion-slide";
      slide.dataset.slide = String(index);
      slide.innerHTML = `
        <span class="prism-motion-kicker">PUSHIN / ROBINHOOD CHAIN</span>
        <strong class="prism-motion-number" data-target="${stat.value}" data-suffix="${stat.suffix}">0${stat.suffix}</strong>
        <span class="prism-motion-label">${stat.label}</span>
      `;
      track.append(slide);
    });

    viewport.append(track);
    rail.append(viewport);

    const dots = document.createElement("div");
    dots.className = "prism-motion-dots";
    protocolStats.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "prism-motion-dot";
      dot.setAttribute("aria-label", `Show protocol figure ${index + 1}`);
      dot.dataset.slideTarget = String(index);
      dots.append(dot);
    });
    rail.append(dots);
    header.insertAdjacentElement("afterend", rail);

    let active = 0;
    let timer;
    const slides = Array.from(track.children);
    const buttons = Array.from(dots.children);

    const show = (index) => {
      active = (index + slides.length) % slides.length;
      track.style.transform = `translate3d(-${active * 100}%, 0, 0)`;
      slides.forEach((slide, slideIndex) => {
        const selected = slideIndex === active;
        slide.classList.toggle("is-active", selected);
        slide.setAttribute("aria-hidden", selected ? "false" : "true");
      });
      buttons.forEach((button, buttonIndex) => {
        const selected = buttonIndex === active;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-current", selected ? "true" : "false");
      });
      animateCounter(slides[active].querySelector("[data-target]"));
    };

    const start = () => {
      if (reduceMotion) return;
      window.clearInterval(timer);
      timer = window.setInterval(() => show(active + 1), 3600);
    };
    const stop = () => window.clearInterval(timer);

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        show(Number(button.dataset.slideTarget));
        start();
      });
    });
    rail.addEventListener("pointerenter", stop);
    rail.addEventListener("pointerleave", start);
    rail.addEventListener("focusin", stop);
    rail.addEventListener("focusout", start);

    let startX = 0;
    rail.addEventListener("pointerdown", (event) => { startX = event.clientX; });
    rail.addEventListener("pointerup", (event) => {
      const distance = event.clientX - startX;
      if (Math.abs(distance) > 42) show(active + (distance < 0 ? 1 : -1));
      start();
    });

    show(0);
    start();
  };

  const mountReveals = () => {
    const candidates = Array.from(document.querySelectorAll(
      "main section, main article, main [class*='rounded-card'], main .group\\/spot"
    )).filter((node) => !node.closest("[hidden]") && !node.classList.contains("prism-motion-slide"));

    candidates.forEach((node, index) => {
      node.classList.add("prism-motion-enter");
      node.style.setProperty("--prism-enter-delay", `${Math.min(index % 4, 3) * 65}ms`);
      if (index % 2) node.classList.add("prism-motion-enter--right");
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      candidates.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    candidates.forEach((node) => observer.observe(node));
  };

  const mountScrollProgress = () => {
    const bar = document.createElement("div");
    bar.className = "prism-scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.append(bar);

    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      document.documentElement.style.setProperty("--prism-scroll-progress", String(progress));
      document.documentElement.style.setProperty("--prism-parallax", `${Math.min(window.scrollY * 0.045, 28)}px`);
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  };

  const mountCardMotion = () => {
    document.querySelectorAll(".pusheen-room-section, .pusheen-gallery-card").forEach((card) => {
      card.classList.add("prism-motion-float");
    });
  };

  const mountOverviewTransferredCats = () => {
    if (!document.body.classList.contains("pusheen-page--overview")) return;
    const riskHeading = Array.from(document.querySelectorAll("h2"))
      .find((heading) => heading.textContent.trim() === "Risk safeguards");
    const riskSection = riskHeading?.closest("section");
    if (!riskSection) return;

    riskSection.classList.add("pushin-overview-art-anchor");
    riskSection.setAttribute("data-pushin-transferred-cats", "true");
    const systemHeading = Array.from(document.querySelectorAll("h2"))
      .find((heading) => heading.textContent.trim() === "System");
    systemHeading?.closest("section")?.classList.add("pushin-overview-system-section");
  };

  const mount = () => {
    if (document.documentElement.dataset.prismMotion === "ready") return;
    document.documentElement.dataset.prismMotion = "ready";
    mountProtocolCarousel();
    mountReveals();
    mountScrollProgress();
    mountCardMotion();
    mountOverviewTransferredCats();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
