function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseMD(text) {
  const lines = text.split('\n');
  const menus = [];
  let currentMenu = null;
  let currentSection = null;
  let currentWineGroup = null;
  let currentItem = null;
  const menuTitleCount = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      const title = trimmed.slice(3).trim();
      const key = title.toLowerCase().replace(/\s+/g, '-');
      menuTitleCount[key] = (menuTitleCount[key] || 0) + 1;
      let id;
      if (key === 'breakfast-menu') {
        id = menuTitleCount[key] === 1 ? 'breakfast' : 'guest-breakfast';
      } else if (key === 'dinner-menu') {
        id = 'dinner';
      } else if (key === 'lunch-menu') {
        id = 'lunch';
      } else {
        id = key.replace(/-menu$/, '');
      }
      currentMenu = { title, id, served: null, note: null, sections: [] };
      menus.push(currentMenu);
      currentSection = null;
      currentWineGroup = null;
      currentItem = null;

    } else if (trimmed.startsWith('### ') && currentMenu) {
      const title = trimmed.slice(4).trim();
      currentSection = { title, notesBefore: [], notesAfter: [], items: [], wineGroups: null };
      currentMenu.sections.push(currentSection);
      currentWineGroup = null;
      currentItem = null;

    } else if (trimmed.startsWith('##### ') && currentMenu) {
      currentMenu.served = trimmed.slice(6).trim();

    } else if (trimmed.startsWith('#### ') && currentSection) {
      const title = trimmed.slice(5).trim();
      if (!currentSection.wineGroups) currentSection.wineGroups = [];
      currentWineGroup = { title, items: [] };
      currentSection.wineGroups.push(currentWineGroup);
      currentItem = null;

    } else if (trimmed.startsWith('- **')) {
      // Ensure we have a section (items before first ### go into a default section)
      if (currentMenu && !currentSection) {
        const defaultTitle = currentMenu.title.replace(/ Menu$/, '');
        currentSection = { title: defaultTitle, notesBefore: [], notesAfter: [], items: [], wineGroups: null };
        currentMenu.sections.push(currentSection);
      }
      if (!currentMenu || !currentSection) continue;

      const match = trimmed.match(/^- \*\*(.+?)\*\*(?:\s*—\s*(.+?))?[\s]*$/);
      if (!match) continue;

      const name = match[1].trim();
      let price = null;
      let desc = null;
      if (match[2]) {
        const val = match[2].trim();
        if (/€/.test(val)) {
          price = val;
        } else {
          desc = val;
        }
      }
      currentItem = { name, price, desc, allergens: '' };
      if (currentWineGroup) {
        currentWineGroup.items.push(currentItem);
      } else {
        currentSection.items.push(currentItem);
      }

    } else if (trimmed.startsWith('- ') && currentItem) {
      // Allergen line: "    - 1 2 3"
      currentItem.allergens = trimmed.slice(2).trim();

    } else if (trimmed.startsWith('*(')) {
      // Inline parenthetical note — append to current item description
      const note = trimmed.replace(/^\*\(/, '').replace(/\)\*?$/, '').trim();
      if (currentItem) {
        currentItem.desc = currentItem.desc ? currentItem.desc + ' — ' + note : note;
      }

    } else if (/^\*[^*]/.test(trimmed)) {
      // Italic line — note for section (before/after items) or menu
      const noteText = trimmed.replace(/^\*+/, '').replace(/\*+$/, '').trim();
      if (currentSection && currentSection.items.length > 0) {
        currentSection.notesAfter.push(noteText);
      } else if (currentSection) {
        currentSection.notesBefore.push(noteText);
      } else if (currentMenu && !currentMenu.note) {
        currentMenu.note = noteText;
      }
      currentItem = null;

    } else if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---') && currentItem) {
      // Description line or wine embedded price (e.g. "Sauvignon Blanc, Chile — €7.90 / €29.00")
      const wineMatch = trimmed.match(/^(.+?)\s*—\s*(€[\d.,]+\s*\/\s*€[\d.,]+)$/);
      if (wineMatch && currentWineGroup) {
        if (!currentItem.desc) currentItem.desc = wineMatch[1].trim();
        if (!currentItem.price) currentItem.price = wineMatch[2].trim();
      } else if (!currentItem.desc && trimmed) {
        currentItem.desc = trimmed;
      }
    }
  }

  return menus;
}

function renderItem(item) {
  const nameHtml = escapeHTML(item.name);
  let rowContent = `<span class="item-name">${nameHtml}</span>`;

  if (item.price) {
    const dualMatch = item.price.match(/^(€[\d.,]+)\s*\/\s*(€[\d.,]+)$/);
    if (dualMatch) {
      rowContent += `<span class="item-dots"></span><span class="price-dual">${escapeHTML(dualMatch[1])}<span class="sep">/</span>${escapeHTML(dualMatch[2])}</span>`;
    } else {
      rowContent += `<span class="item-dots"></span><span class="item-price">${escapeHTML(item.price)}</span>`;
    }
  }

  const descHtml = item.desc ? `<span class="item-desc">${escapeHTML(item.desc)}</span>` : '';
  return `<div class="item"><div class="item-row">${rowContent}</div>${descHtml}<div class="item-allergens">${escapeHTML(item.allergens)}</div></div>`;
}

function renderSection(section) {
  const titleHtml = `<div class="section-title-rule"><div class="title-line"></div><span>${escapeHTML(section.title)}</span><div class="title-line"></div></div>`;

  const noteBeforeHtml = section.notesBefore.length > 0
    ? `<p class="section-note">${section.notesBefore.map(escapeHTML).join('<br>')}</p>` : '';
  const noteAfterHtml = section.notesAfter.length > 0
    ? `<p class="section-note">${section.notesAfter.map(escapeHTML).join('<br>')}</p>` : '';

  let bodyHtml = '';
  if (section.wineGroups) {
    bodyHtml = section.wineGroups.map(wg =>
      `<div class="wine-group"><div class="wine-group-title">${escapeHTML(wg.title)}</div>${wg.items.map(renderItem).join('')}</div>`
    ).join('');
  } else {
    bodyHtml = section.items.map(renderItem).join('');
  }

  return `<div class="section">${titleHtml}${noteBeforeHtml}${bodyHtml}${noteAfterHtml}</div>`;
}

const menuChevronSvg = `<svg class="menu-chevron-icon" viewBox="0 0 14 9" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><polyline points="1,1 7,8 13,1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function renderMenus(menus) {
  const container = document.querySelector('.menus');
  if (!container) return;

  const nav = document.querySelector('nav');
  if (nav) {
    nav.innerHTML = menus.map(menu => {
      const label = menu.title.replace(/\s*Menu\s*/gi, '').trim();
      return `<a href="#${menu.id}">${escapeHTML(label)}</a>`;
    }).join('');
  }

  container.innerHTML = menus.map(menu => {
    const servedHtml = menu.served ? `<h3 class="menu-note">${escapeHTML(menu.served)}</h3>` : '';
    const noteHtml = menu.note ? `<span class="menu-subnote">${escapeHTML(menu.note)}</span>` : '';
    const sectionsHtml = menu.sections.map(renderSection).join('');
    return `<article class="menu" id="${menu.id}">
      <div class="menu-header">
        <div class="menu-title-row">
          <h2>${escapeHTML(menu.title)}</h2>
          <button class="menu-toggle" aria-label="Toggle menu">${menuChevronSvg}</button>
        </div>
        ${servedHtml}
        ${noteHtml}
      </div>
      <div class="menu-body">${sectionsHtml}</div>
    </article>`;
  }).join('');
}

const xhr = new XMLHttpRequest();
xhr.open('GET', 'markdown/menu-allergens.md');
xhr.onload = function () {
  renderMenus(parseMD(xhr.responseText));
  document.dispatchEvent(new Event('menusReady'));
};
xhr.send();
