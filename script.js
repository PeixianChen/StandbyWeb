const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wideQuery = window.matchMedia("(min-width: 760px)");
const main = document.querySelector("[data-sections]");
const pageStatus = document.querySelector("[data-page-status]");
const topbar = document.querySelector(".topbar");
const menuButton = document.querySelector(".topbar-menu");
const menu = document.querySelector(".section-menu");
const menuList = document.querySelector("[data-section-menu]");
const currentTitleLabel = document.querySelector("[data-current-title]");
const showDialog = document.querySelector(".show-dialog");

const pad = (value) => String(value).padStart(2, "0");
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const assetUrl = (path) => `./${path.split("/").map(encodeURIComponent).join("/")}`;

function create(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

const CHEVRONS = {
  up: "M5 15l7-7 7 7",
  down: "M5 9l7 7 7-7",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
};

function createArrowButton(direction, label) {
  const button = create("button", "arrow-button");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  button.type = "button";
  button.setAttribute("aria-label", label);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  path.setAttribute("d", CHEVRONS[direction]);
  svg.append(path);
  button.append(svg);
  return button;
}

function createImage(image, alt = "", { eager = false, className } = {}) {
  const element = create("img", className);
  element.src = assetUrl(image.src);
  element.alt = alt;
  if (image.width && image.height) {
    element.width = image.width;
    element.height = image.height;
  }
  element.loading = eager ? "eager" : "lazy";
  element.decoding = "async";
  return element;
}

function observeVisibility(element, threshold, callback) {
  if (!("IntersectionObserver" in window)) {
    callback(true);
    return;
  }
  new IntersectionObserver(([entry]) => callback(entry.isIntersecting), { threshold }).observe(element);
}

const revealObserver =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-shown");
            revealObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.2 },
      )
    : null;

function reveal(element) {
  element.classList.add("reveal");
  if (revealObserver && !reducedMotion) revealObserver.observe(element);
  else element.classList.add("is-shown");
  return element;
}

function createSectionHeader(section) {
  const header = create("header", "section-header");
  if (section.subtitle) header.append(create("p", "section-eyebrow", section.subtitle));
  header.append(create("h2", "section-title", section.title));
  return reveal(header);
}

function createSection(section, className) {
  const element = create("section", `section ${className}`);
  element.id = section.id;
  element.setAttribute("aria-label", section.title);
  if (section.type === "hero") return element;
  if (section.background) {
    const background = create("div", "section-background");
    background.setAttribute("aria-hidden", "true");
    background.append(createImage(section.background));
    element.classList.add("has-background");
    element.append(background);
  }
  element.append(createSectionHeader(section));
  return element;
}

function appendNote(element, section) {
  if (section.note) element.append(reveal(create("p", "section-note", section.note)));
}

/* 01 首屏 */
function renderHero(section, context) {
  const element = createSection(section, "hero");
  const inner = create("div", "hero-inner");
  const logo = createImage(section.logo, "Stand:by 新的派", { eager: true, className: "hero-logo" });
  inner.append(logo, create("h1", "hero-title", section.title));
  if (section.subtitle) inner.append(create("p", "hero-subtitle", section.subtitle));

  if (section.background) {
    const background = create("div", "hero-background");
    background.setAttribute("aria-hidden", "true");
    background.append(createImage(section.background, "", { eager: true }));
    element.append(background);
  }

  const cta = create("a", "hero-cta");
  cta.href = context.next ? `#${context.next.id}` : "#top";
  const dots = create("span", "hero-cta-dots");
  dots.append(create("i"), create("i"), create("i"));
  cta.append(create("span", "", section.cta ?? "向下浏览"), dots);
  element.append(inner, cta);
  return { element };
}

/* 02 核心数据 */
function splitFigure(value) {
  const match = value.match(/^(.*?\S)\s*([\u3400-\u9fff]+)$/u);
  return match ? { number: match[1], unit: match[2] } : { number: value, unit: "" };
}

function renderFigures(section) {
  const element = createSection(section, "figures");
  const stage = reveal(create("div", "figures-stage"));
  const windowElement = create("div", "figures-window");
  const controls = create("div", "figures-controls");
  const previous = createArrowButton("up", "上一组数据");
  const next = createArrowButton("down", "下一组数据");
  const count = create("span", "figures-count");
  const progress = create("div", "figures-progress");
  const total = section.items.length;

  windowElement.tabIndex = 0;
  windowElement.setAttribute("role", "region");
  windowElement.setAttribute("aria-label", `${section.title}，可上下滑动`);

  section.items.forEach((item) => {
    const figure = create("div", "figure");
    const value = create("p", "figure-value");
    const { number, unit } = splitFigure(item.value);
    value.style.setProperty("--chars", String(Math.max(3, [...number].length)));
    value.append(create("span", "figure-number", number));
    if (unit) value.append(create("span", "figure-unit", unit));
    figure.append(create("p", "figure-label", item.label), value);
    windowElement.append(figure);
  });

  for (let i = 0; i < total; i += 1) progress.append(create("i"));
  controls.append(previous, count, next);
  stage.append(windowElement, controls, progress);
  element.append(stage);

  const init = () => {
    let index = 0;
    let direction = 1;
    let visible = false;
    let holdUntil = 0;
    let programmaticUntil = 0;

    const update = () => {
      if (!windowElement.clientHeight) return;
      index = clamp(Math.round(windowElement.scrollTop / windowElement.clientHeight), 0, total - 1);
      count.textContent = `${pad(index + 1)} / ${pad(total)}`;
      previous.disabled = index === 0;
      next.disabled = index === total - 1;
      [...progress.children].forEach((bar, i) => bar.classList.toggle("is-active", i === index));
      [...windowElement.children].forEach((figure, i) => figure.classList.toggle("is-active", i === index));
    };

    const goTo = (target, manual = false) => {
      if (manual) holdUntil = Date.now() + 9000;
      programmaticUntil = Date.now() + 900;
      windowElement.scrollTo({
        top: clamp(target, 0, total - 1) * windowElement.clientHeight,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    };

    windowElement.addEventListener(
      "scroll",
      () => {
        update();
        if (Date.now() > programmaticUntil) holdUntil = Date.now() + 9000;
      },
      { passive: true },
    );
    windowElement.addEventListener("keydown", (event) => {
      if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      goTo(index + (event.key === "ArrowDown" ? 1 : -1), true);
    });
    previous.addEventListener("click", () => goTo(index - 1, true));
    next.addEventListener("click", () => goTo(index + 1, true));
    window.addEventListener("resize", () => {
      programmaticUntil = Date.now() + 200;
      windowElement.scrollTop = index * windowElement.clientHeight;
    });
    observeVisibility(windowElement, 0.6, (isVisible) => {
      visible = isVisible;
    });

    window.setInterval(() => {
      if (!visible || reducedMotion || document.hidden || Date.now() < holdUntil || total < 2) return;
      if (index === total - 1) direction = -1;
      else if (index === 0) direction = 1;
      goTo(index + direction);
    }, 3400);

    update();
  };

  return { element, init };
}

/* 03 综艺 IP：每张海报铺满一屏，标题压在海报底部 */
function renderIp(section) {
  const element = createSection(section, "ip");
  const list = create("div", "ip-list");

  section.items.forEach((item) => {
    const card = create("figure", "ip-card");
    card.append(createImage(item.image, item.title), create("figcaption", "ip-caption", item.title));
    list.append(card);
  });

  element.append(list);
  return { element };
}

/* 04 现场照片：两行照片反向滚动，可手动滑动 */
function renderScenes(section) {
  const element = createSection(section, "scenes");
  const rows = [
    { items: section.items, speed: 22, className: "marquee-large" },
    { items: [...section.items].reverse(), speed: -16, className: "marquee-small" },
  ];

  const marquees = rows.map((row, rowIndex) => {
    const marquee = create("div", `marquee ${row.className}`);
    const track = create("div", "marquee-track");
    marquee.tabIndex = 0;
    marquee.setAttribute("role", "region");
    marquee.setAttribute("aria-label", `${section.title}第 ${rowIndex + 1} 行，可左右滑动`);

    const repeated = [];
    while (repeated.length < Math.max(5, row.items.length)) repeated.push(...row.items);

    for (let copy = 0; copy < 2; copy += 1) {
      const group = create("div", "marquee-group");
      if (copy) group.setAttribute("aria-hidden", "true");
      repeated.forEach((image, i) => {
        const isDuplicate = copy > 0 || i >= row.items.length;
        group.append(createImage(image, isDuplicate ? "" : image.alt, { eager: rowIndex === 0 && i < 3 && !copy }));
      });
      track.append(group);
    }

    marquee.append(track);
    element.append(reveal(marquee));
    return { marquee, group: track.firstElementChild, speed: row.speed, position: 0, holdUntil: 0, touching: false };
  });

  appendNote(element, section);

  const init = () => {
    let visible = false;
    let last = performance.now();

    marquees.forEach((row) => {
      const hold = () => {
        row.holdUntil = Date.now() + 2400;
      };
      row.marquee.addEventListener("pointerdown", () => {
        row.touching = true;
      });
      ["pointerup", "pointercancel", "pointerleave"].forEach((type) =>
        row.marquee.addEventListener(type, () => {
          row.touching = false;
          hold();
        }),
      );
      row.marquee.addEventListener("touchstart", () => (row.touching = true), { passive: true });
      row.marquee.addEventListener("touchend", () => ((row.touching = false), hold()), { passive: true });
      row.marquee.addEventListener("wheel", hold, { passive: true });
      row.marquee.addEventListener(
        "scroll",
        () => {
          const width = row.group.offsetWidth;
          if (!width) return;
          if (row.marquee.scrollLeft >= width) row.marquee.scrollLeft -= width;
          else if (row.marquee.scrollLeft <= 0) row.marquee.scrollLeft += width;
          if (row.touching || Date.now() < row.holdUntil) row.position = row.marquee.scrollLeft;
        },
        { passive: true },
      );
    });

    const tick = (now) => {
      const delta = Math.min(64, now - last) / 1000;
      last = now;
      if (visible && !document.hidden) {
        marquees.forEach((row) => {
          const width = row.group.offsetWidth;
          if (!width || row.touching || Date.now() < row.holdUntil) return;
          if (!row.position) row.position = row.speed < 0 ? width * 0.6 : width * 0.1;
          row.position = (row.position + row.speed * delta + width) % width;
          row.marquee.scrollLeft = row.position;
        });
      }
      requestAnimationFrame(tick);
    };

    if (reducedMotion) return;
    observeVisibility(element, 0.05, (isVisible) => {
      visible = isVisible;
    });
    requestAnimationFrame(tick);
  };

  return { element, init };
}

/* 05 专场演出：一横排轮播，中间最大，向两侧依次变小 */
const POSTER_GAP = 0.05;
const POSTER_SLOTS = [1, 0.66, 0.44, 0.44].reduce((slots, scale, i) => {
  const previous = slots[i - 1];
  const offset = previous ? previous.offset + previous.scale / 2 + POSTER_GAP + scale / 2 : 0;
  return [...slots, { scale, offset }];
}, []);

function renderShows(section) {
  const element = createSection(section, "shows");
  const header = element.querySelector(".section-header");
  const controls = create("div", "shows-controls");
  const previous = createArrowButton("left", "上一个专场演出");
  const next = createArrowButton("right", "下一个专场演出");
  const stage = create("div", "shows-stage");
  const caption = create("div", "shows-caption");
  const captionArtist = create("p", "shows-caption-artist");
  const captionTitle = create("p", "shows-caption-title");
  const shows = section.items;
  const total = shows.length;
  let index = 0;
  let holdUntil = 0;
  let preload = false;

  controls.append(previous, next);
  header.append(controls);
  stage.tabIndex = 0;
  stage.setAttribute("role", "region");
  stage.setAttribute("aria-label", `${section.title}轮播，可左右滑动`);
  caption.setAttribute("aria-live", "polite");
  caption.append(captionArtist, captionTitle);

  const posters = shows.map((show, i) => {
    const button = create("button", "poster");
    button.type = "button";
    button.append(createImage(show.poster, `${show.title}海报`));
    button.addEventListener("click", () => {
      holdUntil = Date.now() + 10000;
      if (i !== index) setShow(i);
      else openShow(show);
    });
    stage.append(button);
    return button;
  });

  function setShow(target) {
    index = (target + total) % total;
    const maxDistance = wideQuery.matches ? 3 : 2;
    posters.forEach((button, i) => {
      let delta = (i - index + total) % total;
      if (delta > total / 2) delta -= total;
      const distance = Math.abs(delta);
      const sign = Math.sign(delta);
      const hidden = distance > maxDistance;
      if (preload && distance <= maxDistance + 1) button.firstElementChild.loading = "eager";
      button.classList.toggle("is-active", distance === 0);
      button.setAttribute("aria-hidden", String(hidden));
      button.tabIndex = distance === 0 ? 0 : -1;
      button.setAttribute(
        "aria-label",
        `${shows[i].artist}《${shows[i].title}》，${distance === 0 ? "查看详情" : "移到中间"}`,
      );
      const slot = POSTER_SLOTS[Math.min(distance, POSTER_SLOTS.length - 1)];
      button.style.setProperty("--step", String(sign * slot.offset));
      button.style.setProperty("--scale", String(slot.scale));
      button.style.zIndex = String(10 - distance);
      button.style.opacity = hidden ? "0" : String([1, 0.7, 0.4, 0.22][distance]);
    });
    captionArtist.textContent = shows[index].artist;
    captionTitle.textContent = shows[index].title;
  }

  const step = (direction, manual = true) => {
    if (manual) holdUntil = Date.now() + 10000;
    setShow(index + direction);
  };

  previous.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  stage.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    step(event.key === "ArrowRight" ? 1 : -1);
    posters[index].focus({ preventScroll: true });
  });

  let swipeStart = null;
  let swiped = false;
  stage.addEventListener("pointerdown", (event) => {
    holdUntil = Date.now() + 10000;
    swipeStart = { x: event.clientX, y: event.clientY };
    swiped = false;
  });
  stage.addEventListener("pointerup", (event) => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x;
    const dy = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) > 32 && Math.abs(dx) > Math.abs(dy)) {
      swiped = true;
      step(dx < 0 ? 1 : -1);
    }
  });
  stage.addEventListener("pointercancel", () => (swipeStart = null));
  stage.addEventListener(
    "click",
    (event) => {
      if (!swiped) return;
      event.preventDefault();
      event.stopPropagation();
      swiped = false;
    },
    true,
  );

  element.append(reveal(stage), caption);
  setShow(0);

  const init = () => {
    let visible = false;
    const startPreload = () => {
      preload = true;
      setShow(index);
    };
    if ("IntersectionObserver" in window) {
      const nearby = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          nearby.disconnect();
          startPreload();
        },
        { rootMargin: "600px 0px" },
      );
      nearby.observe(stage);
    } else {
      startPreload();
    }
    observeVisibility(stage, 0.35, (isVisible) => {
      visible = isVisible;
    });
    window.setInterval(() => {
      if (!visible || reducedMotion || document.hidden || showDialog.open || Date.now() < holdUntil) return;
      step(1, false);
    }, 3800);
    wideQuery.addEventListener("change", () => setShow(index));
    showDialog.addEventListener("close", () => {
      holdUntil = Date.now() + 8000;
      posters[index].focus({ preventScroll: true });
    });
  };

  return { element, init };
}

function openShow(show) {
  const image = showDialog.querySelector(".show-dialog-image");
  const text = showDialog.querySelector("[data-dialog-text]");
  const source = show.detail ?? show.poster;
  image.src = assetUrl(source.src);
  image.alt = `${show.title}海报`;
  if (source.width && source.height) {
    image.width = source.width;
    image.height = source.height;
  } else {
    image.removeAttribute("width");
    image.removeAttribute("height");
  }
  showDialog.querySelector("[data-dialog-artist]").textContent = show.artist;
  showDialog.querySelector("[data-dialog-title]").textContent = show.title;
  text.textContent = show.description ?? "";
  text.hidden = !show.description;
  showDialog.showModal();
}

/* 06 签约演员：一横排肖像，选中的最大 */
function parseFocus(value) {
  const [x = "50%", y = "30%", scale = "1"] = (value ?? "").split(/\s+/u);
  return { x, y, scale: Number(scale) || 1 };
}

function renderArtists(section) {
  const element = createSection(section, "artists");
  const grid = create("div", "artists-grid");
  const canHover = window.matchMedia("(hover: hover)").matches;

  const cards = section.items.map((artist, i) => {
    const card = create("button", "artist");
    const portrait = create("span", "portrait");
    const image = createImage(artist.photo, artist.name);
    const focus = parseFocus(artist.focus);
    const caption = create("span", "artist-caption");

    card.type = "button";
    card.setAttribute("aria-label", [artist.name, artist.role].filter(Boolean).join("，"));
    image.style.objectPosition = `${focus.x} ${focus.y}`;
    image.style.transformOrigin = `${focus.x} ${focus.y}`;
    image.style.setProperty("--zoom", String(focus.scale));
    portrait.append(image);
    caption.append(create("b", "", artist.name));
    if (artist.role) caption.append(create("span", "", artist.role));
    card.append(portrait, caption);
    card.addEventListener("click", () => setActive(i));
    card.addEventListener("focus", () => setActive(i));
    if (canHover) card.addEventListener("mouseenter", () => setActive(i));
    grid.append(card);
    return card;
  });

  function setActive(target) {
    cards.forEach((card, i) => {
      card.classList.toggle("is-active", i === target);
      card.setAttribute("aria-pressed", String(i === target));
    });
    const card = cards[target];
    const left = card.offsetLeft - (grid.clientWidth - card.offsetWidth) / 2;
    if (grid.scrollWidth > grid.clientWidth) {
      grid.scrollTo({ left, behavior: reducedMotion ? "auto" : "smooth" });
    }
  }

  setActive(0);
  element.append(reveal(grid));
  appendNote(element, section);
  return { element };
}

/* 07 合作资源：不规则拼贴，每次一块放大，其余错位让开 */
function tileSpan(kind, active) {
  if (active) return kind === "photo" ? { w: 4, h: 3 } : { w: 4, h: 2 };
  return kind === "photo" ? { w: 2, h: 2 } : { w: 2, h: 1 };
}

function packTiles(tiles, activeIndex, columns) {
  const grid = [];
  const isFree = (x, y, w, h) => {
    if (x + w > columns) return false;
    for (let row = y; row < y + h; row += 1) {
      for (let column = x; column < x + w; column += 1) if (grid[row]?.[column]) return false;
    }
    return true;
  };
  const occupy = (x, y, w, h, id) => {
    for (let row = y; row < y + h; row += 1) {
      grid[row] ??= [];
      for (let column = x; column < x + w; column += 1) grid[row][column] = id;
    }
  };

  const placed = tiles.map((tile, i) => {
    const span = tileSpan(tile.kind, i === activeIndex);
    for (let y = 0; ; y += 1) {
      for (let x = 0; x <= columns - span.w; x += 1) {
        if (isFree(x, y, span.w, span.h)) {
          occupy(x, y, span.w, span.h, i + 1);
          return { x, y, ...span };
        }
      }
    }
  });

  const rows = Math.max(...placed.map((tile) => tile.y + tile.h));
  placed.forEach((tile, i) => {
    while (tile.y + tile.h < rows && isFree(tile.x, tile.y + tile.h, tile.w, 1)) {
      occupy(tile.x, tile.y + tile.h, tile.w, 1, i + 1);
      tile.h += 1;
    }
    while (isFree(tile.x + tile.w, tile.y, 1, tile.h)) {
      occupy(tile.x + tile.w, tile.y, 1, tile.h, i + 1);
      tile.w += 1;
    }
  });

  return { placed, rows };
}

function renderResources(section) {
  const element = createSection(section, "resources");
  const collage = create("div", "collage");
  const items = section.items.map((item) => ({
    ...item,
    kind: item.image ? "photo" : item.logo ? "logo" : "text",
  }));
  let active = 0;
  let holdUntil = 0;

  const tiles = items.map((item, i) => {
    const tile = create("button", `tile tile-${item.kind}`);
    tile.type = "button";
    tile.setAttribute("aria-label", [item.title, item.note].filter(Boolean).join("，"));
    if (item.kind === "photo") {
      tile.append(createImage(item.image, item.title), create("span", "tile-label", item.title));
    } else if (item.kind === "logo") {
      tile.append(createImage(item.logo, item.title));
    } else {
      tile.append(create("b", "", item.title));
      if (item.note) tile.append(create("small", "", item.note));
    }
    tile.addEventListener("click", () => {
      holdUntil = Date.now() + 8000;
      setActive(i);
    });
    collage.append(tile);
    return tile;
  });

  function layout() {
    const width = collage.clientWidth;
    if (!width) return;
    const columns = wideQuery.matches ? 10 : 6;
    const gap = Math.round(Math.min(width * 0.018, 14));
    const cell = (width - gap * (columns - 1)) / columns;
    const { placed, rows } = packTiles(items, active, columns);
    collage.style.height = `${rows * cell + (rows - 1) * gap}px`;
    placed.forEach((box, i) => {
      Object.assign(tiles[i].style, {
        left: `${box.x * (cell + gap)}px`,
        top: `${box.y * (cell + gap)}px`,
        width: `${box.w * cell + (box.w - 1) * gap}px`,
        height: `${box.h * cell + (box.h - 1) * gap}px`,
      });
      tiles[i].classList.toggle("is-active", i === active);
      tiles[i].setAttribute("aria-pressed", String(i === active));
    });
  }

  function setActive(target) {
    active = (target + items.length) % items.length;
    layout();
  }

  element.append(reveal(collage));
  appendNote(element, section);

  const init = () => {
    let visible = false;
    layout();
    requestAnimationFrame(() => collage.classList.add("is-ready"));
    window.addEventListener("resize", layout);
    observeVisibility(collage, 0.2, (isVisible) => {
      visible = isVisible;
    });
    window.setInterval(() => {
      if (!visible || reducedMotion || document.hidden || Date.now() < holdUntil) return;
      setActive(active + 1);
    }, 3600);
  };

  return { element, init };
}

const renderers = {
  hero: renderHero,
  figures: renderFigures,
  ip: renderIp,
  scenes: renderScenes,
  shows: renderShows,
  artists: renderArtists,
  resources: renderResources,
};

/* 顶栏目录与当前版面 */
function setupNavigation(sections, elements) {
  const links = sections.map((section) => {
    const item = create("li");
    const link = create("a");
    link.href = `#${section.id}`;
    link.append(create("span", "", section.type === "hero" ? "首页" : section.title));
    link.addEventListener("click", () => toggleMenu(false));
    item.append(link);
    menuList.append(item);
    return link;
  });

  function toggleMenu(open) {
    menu.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
  }

  menuButton.addEventListener("click", () => toggleMenu(menu.hidden));
  document.addEventListener("pointerdown", (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !menuButton.contains(event.target)) toggleMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) toggleMenu(false);
  });

  const setCurrent = (i) => {
    currentTitleLabel.textContent = sections[i].type === "hero" ? "目录" : sections[i].title;
    links.forEach((link, linkIndex) => {
      if (linkIndex === i) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };
  setCurrent(0);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setCurrent(elements.indexOf(entry.target));
        });
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    elements.forEach((element) => observer.observe(element));
  }

  const updateTopbar = () => topbar.classList.toggle("is-solid", window.scrollY > 40);
  window.addEventListener("scroll", updateTopbar, { passive: true });
  updateTopbar();
}

showDialog.querySelector(".show-dialog-close").addEventListener("click", () => showDialog.close());
showDialog.addEventListener("click", (event) => {
  if (event.target === showDialog) showDialog.close();
});

async function renderPage() {
  try {
    const response = await fetch("./content/index.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("无法读取 content/index.json，请先运行 node scripts/generate-indexes.mjs。");
    const { sections } = await response.json();
    const supported = sections.filter((section) => renderers[section.type]);

    const rendered = supported.map((section, i) =>
      renderers[section.type](section, { next: supported[i + 1] }),
    );
    main.replaceChildren(...rendered.map((item) => item.element));
    setupNavigation(
      supported,
      rendered.map((item) => item.element),
    );
    rendered.forEach((item) => item.init?.());
    document.body.classList.add("is-loaded");

    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  } catch (error) {
    pageStatus.textContent = "内容读取失败，请检查 content 文件夹。";
    pageStatus.classList.add("is-error");
    console.error(error);
  }
}

renderPage();
