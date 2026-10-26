const navLinks = [...document.querySelectorAll(".site-nav a")];
const linkedSections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const showDialog = document.querySelector(".show-dialog");
const dialogImage = showDialog.querySelector(".dialog-image");
const dialogActor = showDialog.querySelector("[data-dialog-actor]");
const dialogTitle = showDialog.querySelector("[data-dialog-title]");
const dialogDescription = showDialog.querySelector("[data-dialog-description]");
const dialogClose = showDialog.querySelector(".dialog-close");
const showIndexPromise = fetch("./shows/index.json", { cache: "no-cache" }).then((response) => {
  if (!response.ok) throw new Error("无法读取 shows/index.json，请先生成演出索引。");
  return response.json();
});
const photoIndexPromise = fetch("./photos/index.json", { cache: "no-cache" }).then((response) => {
  if (!response.ok) throw new Error("无法读取 photos/index.json，请先生成照片索引。");
  return response.json();
});

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visibleSection = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visibleSection) return;

      navLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${visibleSection.target.id}`;
        link.classList.toggle("is-active", isActive);

        if (isActive) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    },
    {
      rootMargin: "-20% 0px -55% 0px",
      threshold: [0, 0.25, 0.5],
    },
  );

  linkedSections.forEach((section) => sectionObserver.observe(section));
}

async function fetchText(url) {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`无法读取 ${url}`);
  return response.text();
}

async function readShow(category, entry) {
  if (!entry?.folder || !entry?.photo) throw new Error(`${category} 中存在无效索引项。`);
  const folder = `./shows/${category}/${encodeURIComponent(entry.folder)}`;

  const [actor, title, description] = await Promise.all([
    fetchText(`${folder}/actor.txt`),
    fetchText(`${folder}/title.txt`),
    fetchText(`${folder}/description.txt`),
  ]);

  return {
    actor: actor.trim(),
    title: title.trim(),
    description: description.trim(),
    photo: `${folder}/${encodeURIComponent(entry.photo)}`,
  };
}

async function readCategory(category) {
  const index = await showIndexPromise;
  const entries = index[category];

  if (!Array.isArray(entries)) {
    throw new Error(`shows/index.json 中缺少 ${category} 栏目。`);
  }

  const results = await Promise.allSettled(entries.map((entry) => readShow(category, entry)));
  const shows = [];

  results.forEach((result, position) => {
    if (result.status === "fulfilled") {
      shows.push(result.value);
    } else {
      console.error(`跳过无法读取的演出：${entries[position]?.folder ?? position}`, result.reason);
    }
  });

  if (entries.length > 0 && shows.length === 0) {
    throw new Error(`${category} 中的演出资料均无法读取。`);
  }

  return shows;
}

function openShowDialog(show) {
  dialogImage.src = show.photo;
  dialogImage.alt = `${show.title}演出图片`;
  dialogActor.textContent = show.actor;
  dialogTitle.textContent = show.title;
  dialogDescription.textContent = show.description;
  showDialog.showModal();
}

function createShowCard(show) {
  const card = document.createElement("button");
  const imageWrap = document.createElement("span");
  const image = document.createElement("img");
  const meta = document.createElement("span");
  const title = document.createElement("span");
  const actor = document.createElement("span");

  card.className = "show-card";
  card.type = "button";
  card.setAttribute("aria-label", `查看《${show.title}》详情`);
  imageWrap.className = "show-card-image";
  image.src = show.photo;
  image.alt = `${show.title}演出图片`;
  image.loading = "lazy";
  image.decoding = "async";
  meta.className = "show-card-meta";
  title.className = "show-card-title";
  actor.className = "show-card-actor";
  title.textContent = show.title;
  actor.textContent = show.actor;

  meta.append(title, actor);
  imageWrap.append(image);
  card.append(imageWrap, meta);
  card.addEventListener("click", () => openShowDialog(show));

  return card;
}

function enableScrollControls(section, list) {
  const controls = section.querySelector(".scroll-controls");
  const buttons = [...controls.querySelectorAll("button")];

  const updateControls = () => {
    const maximumScroll = Math.max(0, list.scrollWidth - list.clientWidth);
    controls.classList.toggle("is-hidden", maximumScroll <= 1);
    buttons[0].disabled = list.scrollLeft <= 1;
    buttons[1].disabled = list.scrollLeft >= maximumScroll - 1;
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const direction = Number(button.dataset.scrollDirection);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      list.scrollBy({
        left: direction * list.clientWidth * 0.85,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
  });

  list.addEventListener("scroll", updateControls, { passive: true });
  window.addEventListener("resize", updateControls);
  requestAnimationFrame(updateControls);
}

async function renderCategory(section) {
  const category = section.dataset.category;
  const list = section.querySelector("[data-show-list]");

  try {
    const shows = await readCategory(category);
    list.replaceChildren();

    if (shows.length === 0) {
      list.dataset.count = "0";
      const empty = document.createElement("p");
      empty.className = "shows-empty";
      empty.textContent = "暂无演出资料";
      list.append(empty);
      return;
    }

    list.dataset.count = String(shows.length);
    shows.forEach((show) => list.append(createShowCard(show)));
    enableScrollControls(section, list);
  } catch (error) {
    const message = document.createElement("p");
    message.className = "shows-empty";
    message.textContent = "演出资料读取失败，请检查文件是否完整。";
    list.replaceChildren(message);
    console.error(error);
  }
}

document.querySelectorAll(".show-category").forEach(renderCategory);

function createPhotoSlide(fileName, position) {
  const slide = document.createElement("div");
  const image = document.createElement("img");
  const photoName = fileName.replace(/^\d{3}_/u, "").replace(/\.[^.]+$/u, "");

  slide.className = "photo-slide";
  image.src = `./photos/${encodeURIComponent(fileName)}`;
  image.alt = photoName;
  image.loading = position === 0 ? "eager" : "lazy";
  image.decoding = "async";
  slide.append(image);

  return slide;
}

async function renderPhotoCarousel() {
  const carousel = document.querySelector("[data-photo-carousel]");
  const track = carousel.querySelector("[data-photo-track]");
  const previousButton = carousel.querySelector(".photo-control-previous");
  const nextButton = carousel.querySelector(".photo-control-next");
  const currentLabel = carousel.querySelector("[data-photo-current]");
  const totalLabel = carousel.querySelector("[data-photo-total]");

  try {
    const photos = await photoIndexPromise;
    if (!Array.isArray(photos)) throw new Error("photos/index.json 格式不正确。");

    track.replaceChildren();
    totalLabel.textContent = String(photos.length).padStart(2, "0");

    if (photos.length === 0) {
      const empty = document.createElement("p");
      empty.className = "photos-empty";
      empty.textContent = "暂无照片";
      track.append(empty);
      return;
    }

    photos.forEach((fileName, position) => track.append(createPhotoSlide(fileName, position)));
    carousel.classList.toggle("is-static", photos.length === 1);

    let current = 0;
    let timer = null;
    let isVisible = !("IntersectionObserver" in window);
    let isPaused = false;
    let touchStartX = null;

    const showPhoto = (nextIndex) => {
      current = (nextIndex + photos.length) % photos.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      currentLabel.textContent = String(current + 1).padStart(2, "0");
    };

    const stopAutoplay = () => {
      window.clearInterval(timer);
      timer = null;
    };

    const startAutoplay = () => {
      stopAutoplay();
      if (photos.length > 1 && isVisible && !isPaused && !document.hidden) {
        timer = window.setInterval(() => showPhoto(current + 1), 3000);
      }
    };

    const moveManually = (direction) => {
      showPhoto(current + direction);
      startAutoplay();
    };

    previousButton.addEventListener("click", () => moveManually(-1));
    nextButton.addEventListener("click", () => moveManually(1));

    carousel.addEventListener("mouseenter", () => {
      isPaused = true;
      stopAutoplay();
    });
    carousel.addEventListener("mouseleave", () => {
      isPaused = false;
      startAutoplay();
    });
    carousel.addEventListener("focusin", () => {
      isPaused = true;
      stopAutoplay();
    });
    carousel.addEventListener("focusout", (event) => {
      if (!carousel.contains(event.relatedTarget)) {
        isPaused = false;
        startAutoplay();
      }
    });

    carousel.addEventListener(
      "touchstart",
      (event) => {
        touchStartX = event.changedTouches[0].clientX;
        stopAutoplay();
      },
      { passive: true },
    );
    carousel.addEventListener(
      "touchend",
      (event) => {
        if (touchStartX === null) return;
        const distance = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(distance) > 40) showPhoto(current + (distance < 0 ? 1 : -1));
        touchStartX = null;
        startAutoplay();
      },
      { passive: true },
    );

    if ("IntersectionObserver" in window) {
      const carouselObserver = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting;
          if (isVisible) startAutoplay();
          else stopAutoplay();
        },
        { threshold: 0.25 },
      );
      carouselObserver.observe(carousel);
    } else {
      startAutoplay();
    }

    document.addEventListener("visibilitychange", startAutoplay);
    showPhoto(0);
  } catch (error) {
    const message = document.createElement("p");
    message.className = "photos-empty";
    message.textContent = "照片读取失败，请检查照片索引。";
    track.replaceChildren(message);
    console.error(error);
  }
}

renderPhotoCarousel();

dialogClose.addEventListener("click", () => showDialog.close());
showDialog.addEventListener("click", (event) => {
  if (event.target === showDialog) showDialog.close();
});
