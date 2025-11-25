// Global state
let allRecipes = [];
let filteredRecipes = [];
let activeTagFilters = new Set();
let currentScale = 1;
let currentSort = 'name-asc';

// Load all recipes on page load
async function loadRecipes() {
  try {
    const indexResponse = await fetch('recipes/index.json');
    const recipeFiles = await indexResponse.json();

    const recipePromises = recipeFiles.map(async (filename) => {
      const response = await fetch(`recipes/${filename}`);
      return await response.json();
    });

    allRecipes = await Promise.all(recipePromises);
    filteredRecipes = [...allRecipes];

    renderTagFilters();
    applyFilters(); // Apply initial sort
  } catch (error) {
    console.error('Error loading recipes:', error);
    document.getElementById('recipe-grid').innerHTML = '<p>Error loading recipes. Please check the console.</p>';
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
    `<button class="tag-filter" data-tag="${tag}">${tag}</button>`
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
    // Format servings
    const servings = recipe.yield_servings
      ? `${recipe.yield_servings} serving${recipe.yield_servings !== 1 ? 's' : ''}`
      : '? servings';

    // Format time
    const time = recipe.total_time_min
      ? `${recipe.total_time_min} min`
      : '? min';

    return `
      <div class="recipe-card" data-recipe-id="${recipe.id}">
        <div class="recipe-card-front">
          <h2>${recipe.title}</h2>
          <div class="recipe-meta">
            <span>🍽️ ${servings}</span>
            <span>⏱️ ${time}</span>
          </div>
          <div class="recipe-tags">
            ${recipe.tags.slice(0, 5).map(tag => `<span class="tag">${tag}</span>`).join('')}
            ${recipe.tags.length > 5 ? `<span class="tag">+${recipe.tags.length - 5}</span>` : ''}
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

// Render standard (non-modular) recipe
function renderStandardRecipe(recipe, modalBody) {
  modalBody.innerHTML = `
    <div class="modal-controls">
      <button class="cook-mode-toggle" onclick="toggleCookMode()">
        🍳 Cook Mode
      </button>
      <div class="scale-control">
        <label for="scale-select">Scale:</label>
        <select id="scale-select" onchange="updateScale('${recipe.id}')">
          <option value="0.5" ${currentScale === 0.5 ? 'selected' : ''}>0.5x</option>
          <option value="1" ${currentScale === 1 ? 'selected' : ''}>1x</option>
          <option value="2" ${currentScale === 2 ? 'selected' : ''}>2x</option>
          <option value="3" ${currentScale === 3 ? 'selected' : ''}>3x</option>
          <option value="4" ${currentScale === 4 ? 'selected' : ''}>4x</option>
        </select>
      </div>
    </div>

    <div class="normal-view">
      <h2>${recipe.title}</h2>
      ${recipe.source_url ? `<p class="source"><a href="${recipe.source_url}" target="_blank">View Original Recipe</a></p>` : ''}

      <div class="recipe-meta-large">
        ${recipe.yield_servings ? `<span><strong>Servings:</strong> ${Math.round(recipe.yield_servings * currentScale * 10) / 10}</span>` : ''}
        ${recipe.total_time_min ? `<span><strong>Time:</strong> ${recipe.total_time_min} minutes</span>` : ''}
      </div>

      <div class="recipe-tags">
        ${recipe.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>

      <section>
        <h3>Ingredients</h3>
        <ul class="ingredients-list">
          ${recipe.ingredients.map(ing => {
            const amount = formatScaledAmount(ing.amount_g, ing.amount_oz, currentScale);
            return `<li>${amount ? `<strong>${amount}</strong> ` : ''}${ing.name}</li>`;
          }).join('')}
        </ul>
      </section>

      <section>
        <h3>Instructions</h3>
        <ol class="steps-list">
          ${recipe.steps.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </section>

      ${recipe.notes && recipe.notes.length > 0 ? `
        <section>
          <h3>Notes</h3>
          <ul class="notes-list">
            ${recipe.notes.map(note => `<li>${note}</li>`).join('')}
          </ul>
        </section>
      ` : ''}

      <div class="recipe-dates">
        <small>Created: ${recipe.created_at}</small>
        ${recipe.last_updated_at !== recipe.created_at ? `<small>Updated: ${recipe.last_updated_at}</small>` : ''}
      </div>
    </div>

    <div class="cook-view" style="display: none;">
      <div class="cook-mode-header">
        <h2>${recipe.title}</h2>
        <div class="recipe-meta-large">
          ${recipe.yield_servings ? `<span><strong>Servings:</strong> ${Math.round(recipe.yield_servings * currentScale * 10) / 10}</span>` : ''}
          ${recipe.total_time_min ? `<span><strong>Time:</strong> ${recipe.total_time_min} min</span>` : ''}
        </div>
      </div>

      <section>
        <h3>Ingredients</h3>
        <ul class="ingredients-list">
          ${recipe.ingredients.map((ing, idx) => {
            const amount = formatScaledAmount(ing.amount_g, ing.amount_oz, currentScale);
            const text = `${amount ? `<strong>${amount}</strong> ` : ''}${ing.name}`;
            return `<li onclick="toggleIngredient(this)">
              <input type="checkbox" onclick="event.preventDefault()">
              <span>${text}</span>
            </li>`;
          }).join('')}
        </ul>
      </section>

      <section>
        <h3>Instructions</h3>
        <ol class="steps-list">
          ${recipe.steps.map(step =>
            `<li onclick="toggleStep(this)">${step}</li>`
          ).join('')}
        </ol>
      </section>

      ${recipe.notes && recipe.notes.length > 0 ? `
        <section>
          <h3>Notes</h3>
          <ul class="notes-list">
            ${recipe.notes.map(note => `<li>${note}</li>`).join('')}
          </ul>
        </section>
      ` : ''}

      ${recipe.source_url ? `<p class="source"><a href="${recipe.source_url}" target="_blank">View Original Recipe</a></p>` : ''}

      <div class="recipe-dates">
        <small>Created: ${recipe.created_at}</small>
        ${recipe.last_updated_at !== recipe.created_at ? `<small>Updated: ${recipe.last_updated_at}</small>` : ''}
      </div>
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

  const html = `
    <h2>${recipe.title}</h2>
    ${recipe.source_url ? `<p class="source"><a href="${recipe.source_url}" target="_blank">View Original Recipe</a></p>` : ''}

    <div class="recipe-tags">
      ${recipe.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
    </div>

    <div class="modular-selectors">
      <h3>Build Your Bowl</h3>
      ${Object.entries(recipe.components).map(([componentKey, component]) => `
        <div class="component-selector">
          <label><strong>${component.label}${component.required ? ' *' : ''}</strong></label>
          ${component.multiple ?
            // Checkboxes for multiple selection
            `<div class="checkbox-group">
              ${component.options.map(option => `
                <label class="checkbox-option">
                  <input
                    type="checkbox"
                    name="${componentKey}"
                    value="${option.id}"
                    onchange="updateModularRecipe('${recipe.id}')"
                  >
                  <span>${option.name}</span>
                  ${option.time_min ? `<small>(~${option.time_min} min)</small>` : ''}
                </label>
              `).join('')}
            </div>`
            :
            // Dropdown for single selection
            `<select name="${componentKey}" onchange="updateModularRecipe('${recipe.id}')">
              ${component.options.map(option => `
                <option value="${option.id}">
                  ${option.name}${option.time_min ? ` (~${option.time_min} min)` : ''}
                </option>
              `).join('')}
            </select>`
          }
        </div>
      `).join('')}
    </div>

    <div id="modular-recipe-display">
      ${generateModularRecipeDisplay(recipe)}
    </div>

    ${recipe.notes && recipe.notes.length > 0 ? `
      <section>
        <h3>Notes</h3>
        <ul class="notes-list">
          ${recipe.notes.map(note => `<li>${note}</li>`).join('')}
        </ul>
      </section>
    ` : ''}

    <div class="recipe-dates">
      <small>Created: ${recipe.created_at}</small>
      ${recipe.last_updated_at !== recipe.created_at ? `<small>Updated: ${recipe.last_updated_at}</small>` : ''}
    </div>
  `;

  modalBody.innerHTML = html;
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

// Generate the ingredients and steps based on current selections
function generateModularRecipeDisplay(recipe) {
  const selections = window.modularSelections || {};
  let allIngredients = [];
  let allSteps = [];
  let totalTime = 0;

  // Collect ingredients and steps from selected components
  Object.entries(recipe.components).forEach(([componentKey, component]) => {
    const selectedIds = component.multiple ? selections[componentKey] : [selections[componentKey]];

    selectedIds.forEach(selectedId => {
      if (!selectedId) return;

      const option = component.options.find(opt => opt.id === selectedId);
      if (!option) return;

      // Add section header
      allSteps.push(`<strong>${component.label}: ${option.name}</strong>`);

      // Add ingredients with section label
      if (option.ingredients && option.ingredients.length > 0) {
        option.ingredients.forEach(ing => {
          allIngredients.push({
            ...ing,
            section: option.name
          });
        });
      }

      // Add steps
      if (option.steps && option.steps.length > 0) {
        option.steps.forEach(step => {
          allSteps.push(step);
        });
      }

      // Add to total time
      if (option.time_min) {
        totalTime = Math.max(totalTime, option.time_min);
      }
    });
  });

  // Add assembly steps
  if (recipe.assembly) {
    allSteps.push('<strong>Final Assembly</strong>');

    if (recipe.assembly.ingredients) {
      recipe.assembly.ingredients.forEach(ing => {
        allIngredients.push({
          ...ing,
          section: 'Assembly'
        });
      });
    }

    if (recipe.assembly.steps) {
      recipe.assembly.steps.forEach(step => {
        allSteps.push(step);
      });
    }
  }

  return `
    ${totalTime > 0 ? `<div class="recipe-meta-large"><span><strong>Estimated Time:</strong> ${totalTime} minutes (components can be made in advance)</span></div>` : ''}

    <section>
      <h3>Ingredients</h3>
      <ul class="ingredients-list">
        ${allIngredients.map(ing => {
          let amount = '';
          if (ing.amount_g) {
            amount = `${ing.amount_g}g`;
            if (ing.amount_oz) {
              amount += ` (${ing.amount_oz}oz)`;
            }
          }
          return `<li>
            ${amount ? `<strong>${amount}</strong> ` : ''}
            ${ing.name}
            ${ing.section ? `<em style="color: #666; font-size: 0.9em;"> - ${ing.section}</em>` : ''}
          </li>`;
        }).join('')}
      </ul>
    </section>

    <section>
      <h3>Instructions</h3>
      <ol class="steps-list">
        ${allSteps.map(step => {
          if (step.startsWith('<strong>')) {
            return `<li style="list-style: none; font-weight: bold; margin-top: 1em; margin-left: -1.5em;">${step}</li>`;
          }
          return `<li>${step}</li>`;
        }).join('')}
      </ol>
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
  });

  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    const modal = document.getElementById('recipe-modal');
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
});
