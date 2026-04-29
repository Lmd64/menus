document.addEventListener("menusReady", () => {
  const nav = document.querySelector("nav");
  if (nav) document.documentElement.style.setProperty("--nav-h", nav.offsetHeight + "px");
  const siteHeaderEl = document.querySelector(".site-header");
  if (siteHeaderEl) document.documentElement.style.setProperty("--allergens-h", siteHeaderEl.offsetHeight + "px");

  const allergenToggle = document.querySelector(".allergens-toggle");
  const allergenList = document.querySelector(".allergen-filter-list");
  const siteHeader = document.querySelector(".site-header");
  const resetBtn = document.querySelector(".allergen-reset-btn");
  if (allergenToggle && allergenList && siteHeader) {
    allergenToggle.addEventListener("click", () => {
      const isCollapsed = siteHeader.classList.contains("site-header--collapsed");
      if (isCollapsed) {
        siteHeader.classList.remove("site-header--collapsed");
        allergenList.style.height = allergenList.scrollHeight + "px";
        allergenList.addEventListener("transitionend", function h() {
          allergenList.removeEventListener("transitionend", h);
          allergenList.style.height = "";
        }, { once: true });
      } else {
        allergenList.style.height = allergenList.scrollHeight + "px";
        allergenList.offsetHeight;
        allergenList.style.height = "0";
        siteHeader.classList.add("site-header--collapsed");
      }
    });
  }

  // Render allergen blocks inside menu items
  document.querySelectorAll(".item-allergens").forEach(div => {
    if (div.textContent != null) {
      div.dataset.allergens = div.textContent.trim();
      div.innerHTML = div.textContent.split(" ").map(letter =>
        `<span ${letter.trim() === "" ? "" : 'class="item-allergen-block"'}>${letter}</span>`
      ).join("");
    }
  });

  const STORAGE_KEY_ALLERGENS = "selectedAllergens";
  const STORAGE_KEY_NAV = "activeNav";

  const selectedAllergens = new Set();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY_ALLERGENS, JSON.stringify([...selectedAllergens]));
      const activeLink = document.querySelector("nav a.active");
      if (activeLink) {
        localStorage.setItem(STORAGE_KEY_NAV, activeLink.getAttribute("href").slice(1));
      } else {
        localStorage.removeItem(STORAGE_KEY_NAV);
      }
    } catch (_) {}
  }

  function updateResetBtn() {
    if (resetBtn) resetBtn.hidden = selectedAllergens.size === 0;
  }

  function hideItem(item) {
    if (item.dataset.animState === 'hiding' || item.style.display === 'none') return;
    item.dataset.animState = 'hiding';
    item.style.overflow = 'hidden';
    item.style.height = item.offsetHeight + 'px';
    item.style.marginBottom = getComputedStyle(item).marginBottom;
    item.offsetHeight; // reflow
    item.style.transition = 'opacity 0.25s ease, height 0.25s ease, margin-bottom 0.25s ease';
    item.style.opacity = '0';
    item.style.height = '0';
    item.style.marginBottom = '0';
    item.addEventListener('transitionend', function handler(e) {
      if (e.propertyName !== 'height') return;
      item.removeEventListener('transitionend', handler);
      if (item.dataset.animState !== 'hiding') return;
      item.style.display = 'none';
      item.style.transition = '';
      item.dataset.animState = '';
    });
  }

  function showItem(item) {
    if (item.dataset.animState === 'showing') return;
    if (item.style.display !== 'none' && item.dataset.animState === '') return;
    item.dataset.animState = 'showing';
    item.style.display = '';
    item.style.transition = 'none';
    item.style.opacity = '0';
    item.style.height = '0';
    item.style.overflow = 'hidden';
    item.style.marginBottom = '0';
    const targetHeight = item.scrollHeight;
    item.offsetHeight; // reflow
    item.style.transition = 'opacity 0.25s ease, height 0.25s ease, margin-bottom 0.25s ease';
    item.style.opacity = '1';
    item.style.height = targetHeight + 'px';
    item.style.marginBottom = '18px';
    item.addEventListener('transitionend', function handler(e) {
      if (e.propertyName !== 'height') return;
      item.removeEventListener('transitionend', handler);
      if (item.dataset.animState !== 'showing') return;
      item.style.height = '';
      item.style.overflow = '';
      item.style.marginBottom = '';
      item.style.transition = '';
      item.dataset.animState = '';
    });
  }

  function itemWillBeVisible(item) {
    if (selectedAllergens.size === 0) return true;
    const allergenDiv = item.querySelector(".item-allergens");
    const nums = allergenDiv ? allergenDiv.dataset.allergens.split(" ").filter(Boolean) : [];
    return ![...selectedAllergens].some(a => nums.includes(a));
  }

  function setSectionVisible(section, visible) {
    if (visible) {
      if (section.style.display !== 'none' && section.dataset.animState !== 'hiding' && section.dataset.animState !== 'pre-show') return;
      section.dataset.animState = 'showing';
      section.style.display = '';
      section.offsetHeight;
      section.style.transition = 'opacity 0.25s ease';
      section.style.opacity = '1';
      section.addEventListener('transitionend', function h() {
        section.removeEventListener('transitionend', h);
        if (section.dataset.animState !== 'showing') return;
        section.style.transition = '';
        section.dataset.animState = '';
      });
    } else {
      if (section.dataset.animState === 'hiding' || section.style.display === 'none') return;
      section.dataset.animState = 'hiding';
      section.style.transition = 'opacity 0.25s ease';
      section.style.opacity = '0';
      section.addEventListener('transitionend', function h() {
        section.removeEventListener('transitionend', h);
        if (section.dataset.animState !== 'hiding') return;
        section.style.display = 'none';
        section.style.transition = '';
        section.dataset.animState = '';
      });
    }
  }

  function scrollToMenu(id) {
    const target = document.getElementById(id);
    if (!target) return;
    const stickyOffset = [...document.querySelectorAll("nav")]
      .reduce((h, el) => h + el.offsetHeight, 0);
    const top = target.getBoundingClientRect().top + window.scrollY - stickyOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function applyFilter() {
    // Pre-pass: un-hide sections that will have visible items so that
    // scrollHeight can be measured correctly on their child items.
    document.querySelectorAll(".section").forEach(section => {
      if (section.style.display !== 'none') return;
      const items = [...section.querySelectorAll(".item")];
      if (items.some(itemWillBeVisible)) {
        section.style.transition = 'none';
        section.style.opacity = '0';
        section.style.display = '';
        section.dataset.animState = 'pre-show';
      }
    });

    document.querySelectorAll(".item").forEach(item => {
      itemWillBeVisible(item) ? showItem(item) : hideItem(item);
    });

    document.querySelectorAll(".section").forEach(section => {
      const items = [...section.querySelectorAll(".item")];
      if (items.length === 0) return;
      setSectionVisible(section, items.some(itemWillBeVisible));
    });
  }

  document.querySelectorAll(".allergen-filter-item").forEach(el => {
    el.addEventListener("click", () => {
      const allergen = el.dataset.allergen;
      if (selectedAllergens.has(allergen)) {
        selectedAllergens.delete(allergen);
        el.classList.remove("allergen-selected");
      } else {
        selectedAllergens.add(allergen);
        el.classList.add("allergen-selected");
      }
      applyFilter();
      saveState();
      updateResetBtn();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      document.querySelectorAll(".allergen-filter-item.allergen-selected").forEach(el => {
        el.classList.remove("allergen-selected");
      });
      selectedAllergens.clear();
      applyFilter();
      saveState();
      updateResetBtn();
    });
  }

  document.querySelectorAll("nav a").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const alreadyActive = link.classList.contains("active");
      document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
      if (alreadyActive) {
        document.querySelectorAll(".menu").forEach(menu => {
          const body = menu.querySelector(".menu-body");
          body.style.transition = "none";
          menu.classList.remove("menu--collapsed");
          body.style.display = "";
          body.style.height = "";
        });
        requestAnimationFrame(() => {
          document.querySelectorAll(".menu-body").forEach(b => { b.style.transition = ""; });
          document.querySelectorAll(".item").forEach(item => {
            item.dataset.animState = '';
            item.style.display = '';
            item.style.height = '';
            item.style.overflow = '';
            item.style.marginBottom = '';
            item.style.opacity = '';
            item.style.transition = '';
          });
          document.querySelectorAll(".section").forEach(section => {
            section.dataset.animState = '';
            section.style.display = '';
            section.style.opacity = '';
            section.style.transition = '';
          });
          applyFilter();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
        saveState();
        return;
      }
      link.classList.add("active");
      const targetId = link.getAttribute("href").slice(1);
      document.querySelectorAll(".menu").forEach(menu => {
        const body = menu.querySelector(".menu-body");
        body.style.transition = "none";
        if (menu.id === targetId) {
          menu.classList.remove("menu--collapsed");
          body.style.display = "";
          body.style.height = "";
        } else {
          menu.classList.add("menu--collapsed");
          body.style.height = "0";
          body.style.display = "none";
        }
      });
      requestAnimationFrame(() => {
        document.querySelectorAll(".menu-body").forEach(b => { b.style.transition = ""; });
        const targetMenu = document.getElementById(targetId);
        if (targetMenu) {
          targetMenu.querySelectorAll(".item").forEach(item => {
            item.dataset.animState = '';
            item.style.display = '';
            item.style.height = '';
            item.style.overflow = '';
            item.style.marginBottom = '';
            item.style.opacity = '';
            item.style.transition = '';
          });
          targetMenu.querySelectorAll(".section").forEach(section => {
            section.dataset.animState = '';
            section.style.display = '';
            section.style.opacity = '';
            section.style.transition = '';
          });
        }
        if (selectedAllergens.size > 0) {
          targetMenu.querySelectorAll(".item").forEach(item => {
            if (!itemWillBeVisible(item)) item.style.display = 'none';
          });
          targetMenu.querySelectorAll(".section").forEach(section => {
            const items = [...section.querySelectorAll(".item")];
            if (items.length > 0 && !items.some(itemWillBeVisible)) section.style.display = 'none';
          });
        }
        applyFilter();
        requestAnimationFrame(() => {
          scrollToMenu(targetId);
        });
      });
      saveState();
    });
  });

  document.querySelectorAll(".menu-toggle").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const menu = btn.closest(".menu");
      const body = menu.querySelector(".menu-body");
      const isCollapsed = menu.classList.contains("menu--collapsed");
      if (isCollapsed) {
        menu.classList.remove("menu--collapsed");
        body.style.display = '';
        body.offsetHeight;
        body.style.height = body.scrollHeight + 'px';
        body.addEventListener('transitionend', function h() {
          body.removeEventListener('transitionend', h);
          body.style.height = '';
        }, { once: true });
      } else {
        body.style.height = body.scrollHeight + 'px';
        body.offsetHeight;
        body.style.height = '0';
        menu.classList.add("menu--collapsed");
        body.addEventListener('transitionend', function h(e) {
          if (e.propertyName !== 'height') return;
          body.removeEventListener('transitionend', h);
          body.style.display = 'none';
        });
      }
    });
  });

  // Restore persisted state
  try {
    const savedAllergens = JSON.parse(localStorage.getItem(STORAGE_KEY_ALLERGENS) || "[]");
    savedAllergens.forEach(a => {
      selectedAllergens.add(a);
      const el = document.querySelector(`.allergen-filter-item[data-allergen="${a}"]`);
      if (el) el.classList.add("allergen-selected");
    });

    const savedNav = localStorage.getItem(STORAGE_KEY_NAV);
    const savedLink = savedNav ? document.querySelector(`nav a[href="#${savedNav}"]`) : null;
    document.querySelectorAll(".menu").forEach(menu => {
      const body = menu.querySelector(".menu-body");
      if (savedLink && menu.id === savedNav) {
        menu.classList.remove("menu--collapsed");
        body.style.display = "";
        body.style.height = "";
      } else {
        menu.classList.add("menu--collapsed");
        body.style.height = "0";
        body.style.display = "none";
      }
    });
    if (savedLink) {
      savedLink.classList.add("active");
      requestAnimationFrame(() => scrollToMenu(savedNav));
    }
  } catch (_) {}

  if (selectedAllergens.size > 0) applyFilter();
  updateResetBtn();
});
