# Bundles every recipe JSON into recipes/bundle.json for a single-fetch load.
# Run after adding, editing, or removing a recipe.

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$recipesDir = Join-Path $root 'recipes'
$indexPath = Join-Path $recipesDir 'index.json'
$bundlePath = Join-Path $recipesDir 'bundle.json'

$files = Get-Content $indexPath -Raw | ConvertFrom-Json

$recipes = foreach ($file in $files) {
    $path = Join-Path $recipesDir $file
    if (-not (Test-Path $path)) {
        throw "Recipe listed in index.json is missing on disk: $file"
    }
    Get-Content $path -Raw | ConvertFrom-Json
}

$bundle = [pscustomobject]@{
    generated_at = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    count        = $recipes.Count
    recipes      = $recipes
}

# Write UTF-8 without BOM so browsers parse it cleanly.
$json = $bundle | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($bundlePath, $json, (New-Object System.Text.UTF8Encoding $false))

Write-Host "Bundled $($recipes.Count) recipes to $bundlePath"
