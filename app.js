// Global state
let allRecipes = [];
let filteredRecipes = [];
let activeTagFilters = new Set();
let currentScale = 1;
let currentSort = 'name-asc';

// Timer state
let activeTimers = [];
let timerTickId = null;
let nextTimerId = 1;
let audioCtx = null;

// Escape user-supplied strings before injecting into innerHTML.
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Tap-to-start timer detection inside step text.
const TIMER_UNIT_MS = {
  s: 1000, sec: 1000, secs: 1000, second: 1000, seconds: 1000,
  m: 60_000, min: 60_000, mins: 60_000, minute: 60_000, minutes: 60_000,
  h: 3_600_000, hr: 3_600_000, hrs: 3_600_000, hour: 3_600_000, hours: 3_600_000,
};

const TIMER_REGEX = /\b(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;

// Wrap durations in step text with timer buttons. Input must already be HTML-escaped.
function injectTimerButtons(escapedText) {
  return escapedText.replace(TIMER_REGEX, (match, numStr, unit) => {
    const ms = parseFloat(numStr) * TIMER_UNIT_MS[unit.toLowerCase()];
    if (!isFinite(ms) || ms <= 0) return match;
    return `<button type="button" class="timer-trigger" data-ms="${ms}" data-label="${match}" aria-label="Start ${match} timer">&#9201; ${match}</button>`;
  });
}

// Convert a raw step string into safe HTML with timer buttons.
function renderStepText(step) {
  return injectTimerButtons(escapeHtml(step));
}

// Format time in human-readable units
function formatTime(minutes) {
  if (!minutes) return null;

  if (minutes < 60) {
    return `${minutes} min`;
  } else if (minutes < 1440) { // Less than 24 hours
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} hr${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min`;
  } else { // 24 hours or more
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    if (remainingHours === 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
    return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hr${remainingHours !== 1 ? 's' : ''}`;
  }
}

// Load all recipes from the prebuilt bundle (single HTTP request).
async function loadRecipes() {
  try {
    const response = await fetch('recipes/bundle.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Bundle fetch failed: ${response.status}`);
    const bundle = await response.json();

    allRecipes = bundle.recipes || [];
    filteredRecipes = [...allRecipes];

    renderTagFilters();
    applyFilters();
  } catch (error) {
    console.error('Error loading recipes:', error);
    const grid = document.getElementById('recipe-grid');
    grid.textContent = 'Error loading recipes. Please check the console.';
  }
}

// Extract all unique tags from recipes
function getAllTags() {
  const tagSet = new Set();
  allRecipes.forEach(recipe => {
    recipe.tags.forEach(tag => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

// Render tag filter buttons
function renderTagFilters() {
  const tagFiltersContainer = document.getElementById('tag-filters');
  const allTags = getAllTags();

  tagFiltersContainer.innerHTML = allTags.map(tag =>
    `<button class="tag-filter" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
  ).join('');

  // Add click handlers to tag filters
  document.querySelectorAll('.tag-filter').forEach(button => {
    button.addEventListener('click', () => {
      const tag = button.dataset.tag;

      if (activeTagFilters.has(tag)) {
        activeTagFilters.delete(tag);
        button.classList.remove('active');
      } else {
        activeTagFilters.add(tag);
        button.classList.add('active');
      }

      applyFilters();
    });
  });
}

// Sort recipes based on current sort option
function sortRecipes(recipes) {
  return [...recipes].sort((a, b) => {
    switch (currentSort) {
      case 'name-asc':
        return a.title.localeCompare(b.title);
      case 'name-desc':
        return b.title.localeCompare(a.title);
      case 'time-asc':
        // Null times go to the end
        if (a.total_time_min === null && b.total_time_min === null) return 0;
        if (a.total_time_min === null) return 1;
        if (b.total_time_min === null) return -1;
        return a.total_time_min - b.total_time_min;
      case 'time-desc':
        // Null times go to the end
        if (a.total_time_min === null && b.total_time_min === null) return 0;
        if (a.total_time_min === null) return 1;
        if (b.total_time_min === null) return -1;
        return b.total_time_min - a.total_time_min;
      default:
        return 0;
    }
  });
}

// Apply search and tag filters
function applyFilters() {
  const searchTerm = document.getElementById('search').value.toLowerCase();

  filteredRecipes = allRecipes.filter(recipe => {
    // Search filter
    const matchesSearch = !searchTerm ||
      recipe.title.toLowerCase().includes(searchTerm) ||
      recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      (recipe.ingredients && recipe.ingredients.some(ing => ing.name.toLowerCase().includes(searchTerm)));

    // Tag filter
    const matchesTags = activeTagFilters.size === 0 ||
      Array.from(activeTagFilters).every(filterTag =>
        recipe.tags.includes(filterTag)
      );

    return matchesSearch && matchesTags;
  });

  // Apply sorting
  filteredRecipes = sortRecipes(filteredRecipes);

  renderRecipes();
}

// Render recipe cards
function renderRecipes() {
  const grid = document.getElementById('recipe-grid');
  const noResults = document.getElementById('no-results');

  if (filteredRecipes.length === 0) {
    grid.style.display = 'none';
    noResults.style.display = 'block';
    return;
  }

  grid.style.display = 'grid';
  noResults.style.display = 'none';

  grid.innerHTML = filteredRecipes.map(recipe => {
    const servings = recipe.yield_servings
      ? `${recipe.yield_servings} serving${recipe.yield_servings !== 1 ? 's' : ''}`
      : '? servings';
    const time = formatTime(recipe.total_time_min) || '? min';
    const tagsToShow = recipe.tags.slice(0, 5);
    const moreCount = recipe.tags.length - 5;

    return `
      <div class="recipe-card" data-recipe-id="${escapeHtml(recipe.id)}">
        <div class="recipe-card-front">
          <h2>${escapeHtml(recipe.title)}</h2>
          <div class="recipe-meta">
            <span>🍽️ ${escapeHtml(servings)}</span>
            <span>⏱️ ${escapeHtml(time)}</span>
          </div>
          <div class="recipe-tags">
            ${tagsToShow.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            ${moreCount > 0 ? `<span class="tag">+${moreCount}</span>` : ''}
          </div>
          <p class="click-hint">Click for details</p>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers to recipe cards
  document.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', () => {
      const recipeId = card.dataset.recipeId;
      const recipe = allRecipes.find(r => r.id === recipeId);
      showRecipeModal(recipe);
    });
  });
}

// Show recipe details in modal
function showRecipeModal(recipe) {
  const modal = document.getElementById('recipe-modal');
  const modalBody = document.getElementById('modal-body');
  const modalContent = modal.querySelector('.modal-content');

  // Reset cook mode and scale when opening modal
  modalContent.classList.remove('cook-mode');
  currentScale = 1;

  // Check if this is a modular recipe
  if (recipe.modular) {
    renderModularRecipe(recipe, modalBody);
  } else {
    renderStandardRecipe(recipe, modalBody);
  }

  modal.style.display = 'block';
  document.body.classList.add('modal-open');
}

// Format scaled ingredient amount
function formatScaledAmount(amount_g, amount_oz, scale) {
  if (!amount_g) return '';
  const scaledG = Math.round(amount_g * scale * 10) / 10;
  let result = `${scaledG}g`;
  if (amount_oz) {
    const scaledOz = Math.round(amount_oz * scale * 10) / 10;
    result += ` (${scaledOz}oz)`;
  }
  return result;
}

// Update recipe display when scale changes
function updateScale(recipeId) {
  const scaleSelect = document.getElementById('scale-select');
  currentScale = parseFloat(scaleSelect.value);
  const recipe = allRecipes.find(r => r.id === recipeId);
  if (recipe && !recipe.modular) {
    const modalBody = document.getElementById('modal-body');
    renderStandardRecipe(recipe, modalBody);
  }
}

function renderIngredientLi(ing, scale, opts = {}) {
  const withCheckbox = opts.withCheckbox === true;
  const amount = formatScaledAmount(ing.amount_g, ing.amount_oz, scale);
  const amountHtml = amount ? `<strong>${escapeHtml(amount)}</strong> ` : '';
  const nameHtml = escapeHtml(ing.name);
  if (withCheckbox) {
    return `<li onclick="toggleIngredient(this)">
      <input type="checkbox" onclick="event.preventDefault()">
      <span>${amountHtml}${nameHtml}</span>
    </li>`;
  }
  return `<li>${amountHtml}${nameHtml}</li>`;
}

// Render standard (non-modular) recipe
function renderStandardRecipe(recipe, modalBody) {
  const title = escapeHtml(recipe.title);
  const tags = recipe.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');

  const metaLarge = `
    ${recipe.yield_servings ? `<span><strong>Servings:</strong> ${Math.round(recipe.yield_servings * currentScale * 10) / 10}</span>` : ''}
    ${recipe.total_time_min ? `<span><strong>Time:</strong> ${escapeHtml(formatTime(recipe.total_time_min))}</span>` : ''}
  `;

  const ingredientsList = recipe.ingredients.map(ing => renderIngredientLi(ing, currentScale)).join('');
  const stepsList = recipe.steps.map(step => `<li>${renderStepText(step)}</li>`).join('');
  const notesList = (recipe.notes && recipe.notes.length > 0)
    ? `
      <section>
        <h3>Notes</h3>
        <ul class="notes-list">
          ${recipe.notes.map(note => `<li>${escapeHtml(note)}</li>`).join('')}
        </ul>
      </section>
    ` : '';

  const datesBlock = `
    <div class="recipe-dates no-print">
      <small>Created: ${escapeHtml(recipe.created_at)}</small>
      ${recipe.last_updated_at !== recipe.created_at ? `<small>Updated: ${escapeHtml(recipe.last_updated_at)}</small>` : ''}
    </div>
  `;

  const cookIngredients = recipe.ingredients.map(ing => renderIngredientLi(ing, currentScale, { withCheckbox: true })).join('');
  const cookSteps = recipe.steps.map(step =>
    `<li onclick="toggleStep(this)">${renderStepText(step)}</li>`
  ).join('');

  modalBody.innerHTML = `
    <div class="modal-controls no-print">
      <button class="cook-mode-toggle" onclick="toggleCookMode()">
        🍳 Cook Mode
      </button>
      <button class="print-button" onclick="window.print()" aria-label="Print recipe">
        🖨️ Print
      </button>
      <div class="scale-control">
        <label for="scale-select">Scale:</label>
        <select id="scale-select" onchange="updateScale('${escapeHtml(recipe.id)}')">
          <option value="0.5" ${currentScale === 0.5 ? 'selected' : ''}>0.5x</option>
          <option value="1" ${currentScale === 1 ? 'selected' : ''}>1x</option>
          <option value="2" ${currentScale === 2 ? 'selected' : ''}>2x</option>
          <option value="3" ${currentScale === 3 ? 'selected' : ''}>3x</option>
          <option value="4" ${currentScale === 4 ? 'selected' : ''}>4x</option>
        </select>
      </div>
    </div>

    <div class="normal-view print-target">
      <h2>${title}</h2>

      <div class="recipe-meta-large">${metaLarge}</div>

      <div class="recipe-tags no-print">${tags}</div>

      <section>
        <h3>Ingredients</h3>
        <ul class="ingredients-list">${ingredientsList}</ul>
      </section>

      <section>
        <h3>Instructions</h3>
        <ol class="steps-list">${stepsList}</ol>
      </section>

      ${notesList}

      ${datesBlock}
    </div>

    <div class="cook-view" style="display: none;">
      <div class="cook-mode-header">
        <h2>${title}</h2>
        <div class="recipe-meta-large">${metaLarge}</div>
      </div>

      <section>
        <h3>Ingredients</h3>
        <ul class="ingredients-list">${cookIngredients}</ul>
      </section>

      <section>
        <h3>Instructions</h3>
        <ol class="steps-list">${cookSteps}</ol>
      </section>

      ${notesList}

      ${datesBlock}
    </div>
  `;
}

// Render modular recipe with component selectors
function renderModularRecipe(recipe, modalBody) {
  // Initialize selections with first option from each component
  window.modularSelections = {};
  Object.keys(recipe.components).forEach(componentKey => {
    const component = recipe.components[componentKey];
    if (component.multiple) {
      window.modularSelections[componentKey] = [];
    } else {
      window.modularSelections[componentKey] = component.options[0].id;
    }
  });

  const recipeIdSafe = escapeHtml(recipe.id);
  const selectorsHtml = Object.entries(recipe.components).map(([componentKey, component]) => {
    const safeKey = escapeHtml(componentKey);
    const optionsHtml = component.options.map(option => {
      const safeId = escapeHtml(option.id);
      const safeName = escapeHtml(option.name);
      const timeLabel = option.time_min ? `(~${option.time_min} min)` : '';
      if (component.multiple) {
        return `
          <label class="checkbox-option">
            <input type="checkbox" name="${safeKey}" value="${safeId}" onchange="updateModularRecipe('${recipeIdSafe}')">
            <span>${safeName}</span>
            ${timeLabel ? `<small>${escapeHtml(timeLabel)}</small>` : ''}
          </label>
        `;
      }
      return `<option value="${safeId}">${safeName}${timeLabel ? ` ${escapeHtml(timeLabel)}` : ''}</option>`;
    }).join('');

    const control = component.multiple
      ? `<div class="checkbox-group">${optionsHtml}</div>`
      : `<select name="${safeKey}" onchange="updateModularRecipe('${recipeIdSafe}')">${optionsHtml}</select>`;

    return `
      <div class="component-selector">
        <label><strong>${escapeHtml(component.label)}${component.required ? ' *' : ''}</strong></label>
        ${control}
      </div>
    `;
  }).join('');

  modalBody.innerHTML = `
    <div class="modal-controls no-print">
      <button class="print-button" onclick="window.print()" aria-label="Print recipe">
        🖨️ Print
      </button>
    </div>

    <div class="print-target">
      <h2>${escapeHtml(recipe.title)}</h2>

      <div class="recipe-tags no-print">
        ${recipe.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </div>

      <div class="modular-selectors no-print">
        <h3>Build Your Bowl</h3>
        ${selectorsHtml}
      </div>

      <div id="modular-recipe-display">
        ${generateModularRecipeDisplay(recipe)}
      </div>

      ${recipe.notes && recipe.notes.length > 0 ? `
        <section>
          <h3>Notes</h3>
          <ul class="notes-list">
            ${recipe.notes.map(note => `<li>${escapeHtml(note)}</li>`).join('')}
          </ul>
        </section>
      ` : ''}

      <div class="recipe-dates no-print">
        <small>Created: ${escapeHtml(recipe.created_at)}</small>
        ${recipe.last_updated_at !== recipe.created_at ? `<small>Updated: ${escapeHtml(recipe.last_updated_at)}</small>` : ''}
      </div>
    </div>
  `;
}

// Update modular recipe display when selections change
function updateModularRecipe(recipeId) {
  const recipe = allRecipes.find(r => r.id === recipeId);
  if (!recipe || !recipe.modular) return;

  // Update selections from form inputs
  Object.keys(recipe.components).forEach(componentKey => {
    const component = recipe.components[componentKey];
    if (component.multiple) {
      const checkboxes = document.querySelectorAll(`input[name="${componentKey}"]:checked`);
      window.modularSelections[componentKey] = Array.from(checkboxes).map(cb => cb.value);
    } else {
      const select = document.querySelector(`select[name="${componentKey}"]`);
      if (select) {
        window.modularSelections[componentKey] = select.value;
      }
    }
  });

  // Re-render the display
  const displayDiv = document.getElementById('modular-recipe-display');
  if (displayDiv) {
    displayDiv.innerHTML = generateModularRecipeDisplay(recipe);
  }
}

// Generate ingredients and steps from current modular selections.
// Steps are tracked as {type, text} so we can escape safely.
function generateModularRecipeDisplay(recipe) {
  const selections = window.modularSelections || {};
  const allIngredients = [];
  const stepItems = [];
  let totalTime = 0;

  Object.entries(recipe.components).forEach(([componentKey, component]) => {
    const selectedIds = component.multiple ? selections[componentKey] : [selections[componentKey]];

    selectedIds.forEach(selectedId => {
      if (!selectedId) return;
      const option = component.options.find(opt => opt.id === selectedId);
      if (!option) return;

      stepItems.push({ type: 'header', text: `${component.label}: ${option.name}` });

      if (option.ingredients && option.ingredients.length > 0) {
        option.ingredients.forEach(ing => {
          allIngredients.push({ ...ing, section: option.name });
        });
      }

      if (option.steps && option.steps.length > 0) {
        option.steps.forEach(step => stepItems.push({ type: 'step', text: step }));
      }

      if (option.time_min) {
        totalTime = Math.max(totalTime, option.time_min);
      }
    });
  });

  if (recipe.assembly) {
    stepItems.push({ type: 'header', text: 'Final Assembly' });

    if (recipe.assembly.ingredients) {
      recipe.assembly.ingredients.forEach(ing => {
        allIngredients.push({ ...ing, section: 'Assembly' });
      });
    }

    if (recipe.assembly.steps) {
      recipe.assembly.steps.forEach(step => stepItems.push({ type: 'step', text: step }));
    }
  }

  const ingredientsHtml = allIngredients.map(ing => {
    const amount = ing.amount_g ? `${ing.amount_g}g${ing.amount_oz ? ` (${ing.amount_oz}oz)` : ''}` : '';
    return `<li>
      ${amount ? `<strong>${escapeHtml(amount)}</strong> ` : ''}${escapeHtml(ing.name)}
      ${ing.section ? `<em class="ingredient-section"> - ${escapeHtml(ing.section)}</em>` : ''}
    </li>`;
  }).join('');

  const stepsHtml = stepItems.map(item => {
    if (item.type === 'header') {
      return `<li class="step-header">${escapeHtml(item.text)}</li>`;
    }
    return `<li>${renderStepText(item.text)}</li>`;
  }).join('');

  return `
    ${totalTime > 0 ? `<div class="recipe-meta-large"><span><strong>Estimated Time:</strong> ${escapeHtml(formatTime(totalTime))} (components can be made in advance)</span></div>` : ''}

    <section>
      <h3>Ingredients</h3>
      <ul class="ingredients-list">${ingredientsHtml}</ul>
    </section>

    <section>
      <h3>Instructions</h3>
      <ol class="steps-list">${stepsHtml}</ol>
    </section>
  `;
}

// Toggle cook mode
function toggleCookMode() {
  const modalContent = document.querySelector('.modal-content');
  const toggleBtn = document.querySelector('.cook-mode-toggle');
  const normalView = document.querySelector('.normal-view');
  const cookView = document.querySelector('.cook-view');

  modalContent.classList.toggle('cook-mode');
  toggleBtn.classList.toggle('active');

  if (modalContent.classList.contains('cook-mode')) {
    normalView.style.display = 'none';
    cookView.style.display = 'block';
    toggleBtn.textContent = '📖 Normal View';
  } else {
    normalView.style.display = 'block';
    cookView.style.display = 'none';
    toggleBtn.textContent = '🍳 Cook Mode';
  }
}

// Toggle ingredient checkbox
function toggleIngredient(li) {
  const checkbox = li.querySelector('input[type="checkbox"]');
  checkbox.checked = !checkbox.checked;
  li.classList.toggle('checked', checkbox.checked);
}

// Toggle step completion
function toggleStep(li) {
  li.classList.toggle('completed');
}

// --- Timers ---

function beep() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const now = audioCtx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + i * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.3 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.3 + 0.25);
      osc.start(now + i * 0.3);
      osc.stop(now + i * 0.3 + 0.27);
    }
  } catch (err) {
    console.warn('Beep failed:', err);
  }
}

function startTimer(label, durationMs) {
  const id = nextTimerId++;
  activeTimers.push({
    id,
    label,
    endsAt: Date.now() + durationMs,
    durationMs,
    expired: false,
  });
  renderTimerPanel();
  ensureTimerTick();
}

function dismissTimer(id) {
  activeTimers = activeTimers.filter(t => t.id !== id);
  renderTimerPanel();
  if (activeTimers.length === 0 && timerTickId) {
    clearInterval(timerTickId);
    timerTickId = null;
  }
}

function ensureTimerTick() {
  if (timerTickId) return;
  timerTickId = setInterval(() => {
    const now = Date.now();
    let anyJustExpired = false;
    activeTimers.forEach(t => {
      if (!t.expired && now >= t.endsAt) {
        t.expired = true;
        anyJustExpired = true;
      }
    });
    if (anyJustExpired) beep();
    renderTimerPanel();
  }, 250);
}

function formatRemaining(ms) {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function renderTimerPanel() {
  let panel = document.getElementById('timer-panel');
  if (activeTimers.length === 0) {
    if (panel) panel.remove();
    return;
  }
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'timer-panel';
    panel.className = 'no-print';
    document.body.appendChild(panel);
  }

  const now = Date.now();
  panel.innerHTML = `
    <div class="timer-panel-header">Timers</div>
    ${activeTimers.map(t => {
      const remaining = t.endsAt - now;
      const expired = t.expired || remaining <= 0;
      return `
        <div class="timer-row ${expired ? 'expired' : ''}">
          <span class="timer-label">${escapeHtml(t.label)}</span>
          <span class="timer-remaining">${expired ? 'Done!' : escapeHtml(formatRemaining(remaining))}</span>
          <button type="button" class="timer-dismiss" data-timer-id="${t.id}" aria-label="Dismiss timer">&times;</button>
        </div>
      `;
    }).join('')}
  `;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadRecipes();

  // Search input
  document.getElementById('search').addEventListener('input', applyFilters);

  // Sort dropdown
  document.getElementById('sort-select').addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFilters();
  });

  // Clear filters button
  document.getElementById('clear-filters').addEventListener('click', () => {
    document.getElementById('search').value = '';
    activeTagFilters.clear();
    document.querySelectorAll('.tag-filter').forEach(btn => btn.classList.remove('active'));
    applyFilters();
  });

  // Modal close button
  document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('recipe-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
  });

  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    const modal = document.getElementById('recipe-modal');
    if (event.target === modal) {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  });

  // Delegated handlers for timer triggers and dismiss buttons.
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest && e.target.closest('.timer-trigger');
    if (trigger) {
      const ms = parseFloat(trigger.dataset.ms);
      const label = trigger.dataset.label || trigger.textContent.trim();
      if (isFinite(ms) && ms > 0) startTimer(label, ms);
      return;
    }
    const dismiss = e.target.closest && e.target.closest('.timer-dismiss');
    if (dismiss) {
      const id = parseInt(dismiss.dataset.timerId, 10);
      if (!isNaN(id)) dismissTimer(id);
    }
  });

  // Register service worker.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  }
});
