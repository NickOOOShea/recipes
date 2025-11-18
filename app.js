// Global state
let allRecipes = [];
let filteredRecipes = [];
let activeTagFilters = new Set();

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
    renderRecipes();
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

// Apply search and tag filters
function applyFilters() {
  const searchTerm = document.getElementById('search').value.toLowerCase();

  filteredRecipes = allRecipes.filter(recipe => {
    // Search filter
    const matchesSearch = !searchTerm ||
      recipe.title.toLowerCase().includes(searchTerm) ||
      recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(searchTerm));

    // Tag filter
    const matchesTags = activeTagFilters.size === 0 ||
      Array.from(activeTagFilters).every(filterTag =>
        recipe.tags.includes(filterTag)
      );

    return matchesSearch && matchesTags;
  });

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

  grid.innerHTML = filteredRecipes.map(recipe => `
    <div class="recipe-card" data-recipe-id="${recipe.id}">
      <div class="recipe-card-front">
        <h2>${recipe.title}</h2>
        <div class="recipe-meta">
          ${recipe.yield_servings ? `<span>🍽️ ${recipe.yield_servings} servings</span>` : ''}
          ${recipe.total_time_min ? `<span>⏱️ ${recipe.total_time_min} min</span>` : ''}
        </div>
        <div class="recipe-tags">
          ${recipe.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        <p class="click-hint">Click for details</p>
      </div>
    </div>
  `).join('');

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

  modalBody.innerHTML = `
    <h2>${recipe.title}</h2>
    ${recipe.source_url ? `<p class="source"><a href="${recipe.source_url}" target="_blank">View Original Recipe</a></p>` : ''}

    <div class="recipe-meta-large">
      ${recipe.yield_servings ? `<span><strong>Servings:</strong> ${recipe.yield_servings}</span>` : ''}
      ${recipe.total_time_min ? `<span><strong>Time:</strong> ${recipe.total_time_min} minutes</span>` : ''}
    </div>

    <div class="recipe-tags">
      ${recipe.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
    </div>

    <section>
      <h3>Ingredients</h3>
      <ul class="ingredients-list">
        ${recipe.ingredients.map(ing => {
          let amount = '';
          if (ing.amount_g) {
            amount = `${ing.amount_g}g`;
            if (ing.amount_oz) {
              amount += ` (${ing.amount_oz}oz)`;
            }
          }
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
  `;

  modal.style.display = 'block';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadRecipes();

  // Search input
  document.getElementById('search').addEventListener('input', applyFilters);

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
