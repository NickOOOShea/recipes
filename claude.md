# Recipe Library - Session Handoff

## Current Status

**Project:** Static recipe flashcard website with JSON-based recipe storage

**Completed:**
- ✅ Full site structure created (`index.html`, `app.js`, `styles.css`)
- ✅ `/recipes/` directory with empty `index.json`
- ✅ Git repository initialized
- ✅ Initial commit made
- ✅ `.gitignore` created
- ✅ User installed and authenticated GitHub CLI (`gh`)

**In Progress:**
- ⏳ Create GitHub repository
- ⏳ Push code to GitHub
- ⏳ Enable GitHub Pages

**Blocked:** GitHub CLI not available in current session PATH. User needs to restart Claude Code.

## Next Steps (After Restart)

1. **Verify GitHub CLI is available:**
   ```bash
   gh auth status
   ```

2. **Create GitHub repository and push:**
   ```bash
   gh repo create recipes --public --source=. --remote=origin --push
   ```

3. **Enable GitHub Pages:**
   ```bash
   gh api repos/{owner}/{repo}/pages -X POST -f source[branch]=master -f source[path]=/
   ```
   (Replace `{owner}` and `{repo}` with actual values from step 2)

4. **Provide live URL to user:**
   - Format: `https://<username>.github.io/recipes/`

5. **Ask user for their first recipe** to add to the library

## Project Context

### Recipe JSON Schema
All recipes in `/recipes/*.json` follow this structure:
- `id`: kebab-case slug from title
- `title`: Human-readable name
- `source_url`: Optional original recipe URL
- `yield_servings`: Integer or null
- `total_time_min`: Integer or null
- `tags`: Array of searchable tags
- `ingredients`: Array with `name`, `amount_g`, `amount_oz` (optional)
- `steps`: Array of instruction strings
- `notes`: Array of additional comments
- `created_at` / `last_updated_at`: YYYY-MM-DD format

### Intelligent Auto-Tagging System
When adding recipes, automatically detect and add relevant tags:

**Categories:** dessert, main course, side dish, appetizer, snack, breakfast, beverage, soup, salad, sauce

**Cooking Methods:** smoker, grill, oven, sous vide, instant pot, slow cooker, stovetop, air fryer, no-cook

**Dietary:** vegetarian, vegan, gluten-free, keto, low-carb, dairy-free, paleo

**Occasions:** thanksgiving, christmas, easter, summer, winter, weeknight, meal prep, party, potluck

**Cuisine:** italian, mexican, asian, chinese, japanese, thai, indian, french, american, southern, bbq

**Proteins:** chicken, beef, pork, fish, seafood, lamb, turkey

**Other:** mac and cheese, pasta, casserole, baking, fermented, pickled, etc.

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
- Never commit without user explicitly asking
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
