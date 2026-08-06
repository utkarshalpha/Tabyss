# Tabyss local/CI verification. Creates only a validated temporary directory.

$ErrorActionPreference = "Stop"
$root = [IO.Path]::GetFullPath($PSScriptRoot)
$tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$verifyRoot = [IO.Path]::GetFullPath((Join-Path $tempBase ("tabyss-verify-" + [Guid]::NewGuid().ToString("N"))))
if (-not $verifyRoot.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to create verification directory outside the system temp directory: $verifyRoot"
}
New-Item -ItemType Directory -Path $verifyRoot | Out-Null

function Invoke-Checked {
  param([scriptblock]$Command, [string]$Label)
  Write-Host "`n== $Label ==" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit code $LASTEXITCODE" }
}

try {
  $javascript = @(
    Get-ChildItem -LiteralPath $root -File -Filter "*.js"
    Get-ChildItem -LiteralPath (Join-Path $root "tests") -Recurse -File -Filter "*.js"
  )
  Invoke-Checked -Label "JavaScript syntax" -Command {
    foreach ($file in $javascript) {
      & node --check $file.FullName
      if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax failed: $($file.FullName)" }
    }
  }

  $testFiles = @(Get-ChildItem -LiteralPath (Join-Path $root "tests") -File -Filter "*.test.js" | ForEach-Object FullName)
  Invoke-Checked -Label "Node tests" -Command { & node --test @testFiles }

  Invoke-Checked -Label "Git whitespace" -Command { & git -C $root diff --check }

  Write-Host "`n== V2 documentation links ==" -ForegroundColor Cyan
  $broken = @()
  Get-ChildItem -LiteralPath (Join-Path $root "docs\v2") -Recurse -File -Filter "*.md" | ForEach-Object {
    $document = $_
    $body = Get-Content -LiteralPath $document.FullName -Raw -Encoding UTF8
    [regex]::Matches($body, '\[[^\]]+\]\((?!https?://|mailto:|#)([^)#]+)(?:#[^)]+)?\)') | ForEach-Object {
      $target = $_.Groups[1].Value
      if (-not (Test-Path -LiteralPath (Join-Path $document.DirectoryName $target))) {
        $broken += "$($document.FullName) -> $target"
      }
    }
  }
  if ($broken.Count) { throw "Broken V2 documentation links:`n$($broken -join "`n")" }
  Write-Host "All relative V2 documentation links resolve."

  $firstZip = Join-Path $verifyRoot "first.zip"
  $secondZip = Join-Path $verifyRoot "second.zip"
  Write-Host "`n== Deterministic package ==" -ForegroundColor Cyan
  & (Join-Path $root "package.ps1") -OutputPath $firstZip
  & (Join-Path $root "package.ps1") -OutputPath $secondZip
  $firstHash = (Get-FileHash -LiteralPath $firstZip -Algorithm SHA256).Hash
  $secondHash = (Get-FileHash -LiteralPath $secondZip -Algorithm SHA256).Hash
  if ($firstHash -ne $secondHash) { throw "Package is not reproducible: $firstHash != $secondHash" }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [IO.Compression.ZipFile]::OpenRead($firstZip)
  try {
    $actualEntries = @($archive.Entries | ForEach-Object FullName)
    # ZIP stores a timezone-free DOS timestamp; compare the encoded local value.
    $actualTimes = @($archive.Entries | ForEach-Object { $_.LastWriteTime.DateTime.ToString("yyyy-MM-ddTHH:mm:ss") } | Sort-Object -Unique)
  } finally {
    $archive.Dispose()
  }
  [string[]]$expectedEntries = Get-Content -LiteralPath (Join-Path $root "package-files.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  if (($actualEntries -join "`n") -ne ($expectedEntries -join "`n")) {
    throw "Archive entries or order differ from package-files.json."
  }
  if ($actualTimes.Count -ne 1 -or $actualTimes[0] -ne "2000-01-01T00:00:00") {
    throw "Archive timestamps are not deterministic: $($actualTimes -join ', ')"
  }
  Write-Host "Reproducible SHA256 $($firstHash.ToLowerInvariant())"
  Write-Host "`nAll Tabyss verification gates passed." -ForegroundColor Green
} finally {
  $resolvedVerifyRoot = [IO.Path]::GetFullPath($verifyRoot)
  if (
    (Test-Path -LiteralPath $resolvedVerifyRoot) -and
    $resolvedVerifyRoot.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase) -and
    (Split-Path -Leaf $resolvedVerifyRoot).StartsWith("tabyss-verify-")
  ) {
    Remove-Item -LiteralPath $resolvedVerifyRoot -Recurse -Force
  }
}
