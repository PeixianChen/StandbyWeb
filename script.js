const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".site-nav");
const menuSymbol = document.querySelector(".menu-symbol");

menuButton.addEventListener("click", () => {
  const isOpen = navigation.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuSymbol.textContent = isOpen ? "−" : "＋";
});

navigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navigation.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuSymbol.textContent = "＋";
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const filters = document.querySelectorAll(".filter");
const archiveItems = document.querySelectorAll(".archive-item");

filters.forEach((filter) => {
  filter.addEventListener("click", () => {
    const selectedYear = filter.dataset.year;
    filters.forEach((button) => button.classList.remove("active"));
    filter.classList.add("active");

    archiveItems.forEach((item) => {
      const shouldShow = selectedYear === "all" || item.dataset.year === selectedYear;
      item.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

const newsletterForm = document.querySelector(".newsletter form");
const newsletterInput = newsletterForm.querySelector("input");
const formNote = document.querySelector(".form-note");

newsletterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formNote.textContent = `谢谢，演出消息将发送至 ${newsletterInput.value}`;
  newsletterInput.value = "";
});
