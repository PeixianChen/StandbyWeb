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
const imageFileNames = ["photo.webp", "photo.jpg", "photo.jpeg", "photo.png", "photo.svg"];
const showIndexPromise = fetch("./shows/index.json", { cache: "no-cache" }).then((response) => {
  if (!response.ok) throw new Error("无法读取 shows/index.json，请先生成演出索引。");
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

async function findPhoto(folder) {
  for (const fileName of imageFileNames) {
    const url = `${folder}/${fileName}`;
    const response = await fetch(url, { cache: "no-cache" });
    if (response.ok) return url;
  }

  throw new Error(`${folder} 中缺少 photo 图片`);
}

async function readShow(category, folderName) {
  const folder = `./shows/${category}/${encodeURIComponent(folderName)}`;

  const [actor, title, description, photo] = await Promise.all([
    fetchText(`${folder}/actor.txt`),
    fetchText(`${folder}/title.txt`),
    fetchText(`${folder}/description.txt`),
    findPhoto(folder),
  ]);

  return {
    actor: actor.trim(),
    title: title.trim(),
    description: description.trim(),
    photo,
  };
}

async function readCategory(category) {
  const index = await showIndexPromise;
  const folders = index[category];

  if (!Array.isArray(folders)) {
    throw new Error(`shows/index.json 中缺少 ${category} 栏目。`);
  }

  return Promise.all(folders.map((folderName) => readShow(category, folderName)));
}

function addMetaRow(list, label, value) {
  const term = document.createElement("dt");
  const detail = document.createElement("dd");
  term.textContent = label;
  detail.textContent = value;
  list.append(term, detail);
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
  const meta = document.createElement("dl");

  card.className = "show-card";
  card.type = "button";
  card.setAttribute("aria-label", `查看《${show.title}》详情`);
  imageWrap.className = "show-card-image";
  image.src = show.photo;
  image.alt = `${show.title}演出图片`;
  image.loading = "lazy";
  image.decoding = "async";
  meta.className = "show-card-meta";

  addMetaRow(meta, "演员", show.actor);
  addMetaRow(meta, "演出名称", show.title);
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

dialogClose.addEventListener("click", () => showDialog.close());
showDialog.addEventListener("click", (event) => {
  if (event.target === showDialog) showDialog.close();
});
