# Recipe Library - Session Handoff

## Current Status

**Project:** Static recipe flashcard website with JSON-based recipe storage

**Completed:**
- ✅ Full site structure created (`index.html`, `app.js`, `styles.css`)
- ✅ Git repository initialized and pushed to GitHub
- ✅ GitHub Pages enabled and live
- ✅ Recipe library with 35+ recipes
- ✅ Modular recipe system implemented (see ramen-modular.json)
- ✅ Intelligent auto-tagging system
- ✅ Search and filter functionality

**Live Site:** https://github.com/NickOOOShea/recipes (GitHub Pages auto-deploys from master branch)

## Project Context

### Recipe JSON Schema
All recipes in `/recipes/*.json` follow this structure:
- `id`: kebab-case slug from title
- `title`: Human-readable name
- `yield_servings`: Integer or null
- `total_time_min`: Integer or null
- `tags`: Array of searchable tags
- `ingredients`: Array with `name`, `amount_g`, `amount_oz` (optional)
- `steps`: Array of instruction strings
- `notes`: Array of additional comments
- `created_at` / `last_updated_at`: YYYY-MM-DD format

### Modular Recipe System

**When the user says "modular" they mean an interactive recipe where users can select components and the recipe dynamically updates.**

**When to use modular recipes:**
- Recipes with interchangeable components (ramen with different broths/tares, pizza with different toppings)
- Recipes where users build their own version (build-your-own-bowl concepts)
- Recipes with many optional variations that would otherwise require dozens of separate recipe cards

**DO NOT create modular recipes for:**
- Simple recipes with one or two optional ingredients
- Recipes that are just a single preparation method
- When a regular recipe with optional ingredients in notes would suffice

**Modular Recipe Schema:**
```json
{
  "id": "recipe-modular",
  "title": "Recipe Name - Build Your Own",
  "modular": true,
  "yield_servings": 1,
  "total_time_min": null,
  "tags": ["tag1", "tag2", "customizable", "modular"],
  "components": {
    "category_name": {
      "label": "Choose Your Category",
      "required": true,
      "multiple": false,
      "options": [
        {
          "id": "option-id",
          "name": "Option Display Name",
          "time_min": 60,
          "ingredients": [
            {"name": "ingredient", "amount_g": 100, "amount_oz": 3.5}
          ],
          "steps": ["Step 1", "Step 2"]
        }
      ]
    },
    "toppings_category": {
      "label": "Select Toppings",
      "required": false,
      "multiple": true,
      "options": [...]
    }
  },
  "assembly": {
    "ingredients": [...],
    "steps": ["Final assembly step 1", "Step 2"]
  },
  "notes": ["Popular combinations and tips"],
  "created_at": "YYYY-MM-DD",
  "last_updated_at": "YYYY-MM-DD"
}
```

**How it works:**
- `modular: true` flag tells app.js to render interactive selectors
- `multiple: false` = dropdown (single select)
- `multiple: true` = checkboxes (multi-select, like toppings)
- Each option contains its own ingredients and steps
- Assembly section contains final construction steps
- app.js dynamically builds ingredient list and steps based on user selections
- Real-time updates as user changes selections

**Example use cases:**
- Ramen: Choose broth + tare + oil + toppings
- Pizza: Choose sauce + cheese + toppings + crust style
- Tacos: Choose protein + toppings + salsa + tortilla type
- Salad: Choose base + protein + dressing + toppings
- Burrito bowl: Choose base + protein + beans + toppings

**Implementation:**
- Frontend handles all interactivity (no backend needed)
- Selections stored in URL hash for sharing custom combinations
- CSS styling in styles.css for `.modular-selectors` and related classes
- See `ramen-modular.json` for complete working example

### Intelligent Auto-Tagging System
When adding recipes, automatically detect and add relevant tags:

**Categories:** dessert, main course, side dish, appetizer, snack, breakfast, beverage, soup, salad, sauce

**Cooking Methods:** smoker, grill, oven, sous vide, instant pot, slow cooker, stovetop, air fryer, no-cook

**Dietary:** vegetarian, vegan, gluten-free, keto, low-carb, dairy-free, paleo

**Occasions:** thanksgiving, christmas, easter, summer, winter, weeknight, meal prep, party, potluck

**Cuisine:** italian, mexican, asian, chinese, japanese, thai, indian, french, american, southern, bbq

**Proteins:** chicken, beef, pork, fish, seafood, lamb, turkey

**Other:** mac and cheese, pasta, casserole, baking, fermented, pickled, wife's favorite, etc.

### Measurement Conversion Rules
- **Always convert to grams** (primary) with optional ounces
- **Volumes to grams:**
  - Water/liquids: 1 ml ≈ 1 g
  - Butter: 1 tbsp ≈ 14 g, 1 cup ≈ 227 g
  - Sugar: 1 tbsp ≈ 12.5 g, 1 cup ≈ 200 g
  - Flour: 1 tbsp ≈ 8 g, 1 cup ≈ 120 g
- **Ounces to grams:** 1 oz = 28.3495 g
- **Add note if approximation was made**

### Workflow for Adding Recipes

1. Pull latest changes: `git pull`
2. Fetch recipe content (from URL or pasted text)
3. Extract and normalize to JSON schema
4. Convert all measurements to grams
5. Add intelligent tags based on recipe type
6. Write `/recipes/<id>.json`
7. Update `/recipes/index.json` (alphabetically sorted)
8. Commit: `git add . && git commit -m "Add recipe: <Title>"`
9. Push: `git push`
10. Show user the final JSON

### Important Notes
- **Auto-commit recipes:** Always commit and push to GitHub after adding recipes (unless you have questions for the user)
- Keep ingredient names searchable and concise
- Steps should be direct and actionable
- Always use today's date: 2025-11-18 (update as needed)
- Site is fully static - no backend required

## File Structure
```
/Recipes/
├── .git/
├── .gitignore
├── index.html          # Main flashcard UI
├── app.js              # Search, filter, modal logic
├── styles.css          # Purple gradient theme
├── claude.md           # This handoff doc
└── recipes/
    └── index.json      # Empty array - ready for recipes
```
