# Tabyss — build the Chrome Web Store upload zip.
# Zips ONLY the runtime files (no docs, no build script) so the package stays lean.
# Usage:  powershell -ExecutionPolicy Bypass -File package.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$manifest = Get-Content (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json
$version = $manifest.version
$zip = Join-Path $root "tabyss-v$version.zip"

# Whitelist of files that ship in the extension.
$runtime = @(
  "manifest.json",
  "background.js", "common.js", "content.js",
  "popup.html", "popup.js",
  "dashboard.html", "dashboard.js",
  "options.html", "options.js",
  "wrapped.html", "wrapped.js",
  "styles.css",
  "icon16.png", "icon48.png", "icon128.png"
)

# Verify every runtime file exists before packaging.
$missing = $runtime | Where-Object { -not (Test-Path (Join-Path $root $_)) }
if ($missing) { throw "Missing runtime files: $($missing -join ', ')" }

if (Test-Path $zip) { Remove-Item $zip -Force }
$paths = $runtime | ForEach-Object { Join-Path $root $_ }
Compress-Archive -Path $paths -DestinationPath $zip -CompressionLevel Optimal

$size = [Math]::Round((Get-Item $zip).Length / 1KB, 1)
Write-Host "Built $zip ($size KB) with $($runtime.Count) files." -ForegroundColor Green
