param(
  [Parameter(Mandatory = $false)]
  [string]$OutputPath
)

# Tabyss - deterministic Chrome Web Store package.
# Usage: powershell -ExecutionPolicy Bypass -File package.ps1 [-OutputPath path.zip]

$ErrorActionPreference = "Stop"
$root = [IO.Path]::GetFullPath($PSScriptRoot)
$manifestPath = Join-Path $root "manifest.json"
$contractPath = Join-Path $root "package-files.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
[string[]]$runtime = Get-Content -LiteralPath $contractPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $runtime.Count) { throw "package-files.json must contain at least one runtime file." }
$rootPrefix = $root.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
foreach ($relativePath in $runtime) {
  $resolvedSource = [IO.Path]::GetFullPath((Join-Path $root $relativePath))
  if (
    [IO.Path]::IsPathRooted($relativePath) -or
    $relativePath.Split(@('/', '\')) -contains ".." -or
    -not $resolvedSource.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)
  ) {
    throw "Unsafe package path: $relativePath"
  }
}

if (-not $OutputPath) {
  $OutputPath = Join-Path $root "tabyss-v$($manifest.version).zip"
}
$zipPath = [IO.Path]::GetFullPath($OutputPath)
if ([IO.Path]::GetExtension($zipPath) -ne ".zip") {
  throw "OutputPath must end in .zip: $zipPath"
}
if (Test-Path -LiteralPath $zipPath -PathType Container) {
  throw "OutputPath is a directory: $zipPath"
}

$missing = $runtime | Where-Object { -not (Test-Path -LiteralPath (Join-Path $root $_) -PathType Leaf) }
if ($missing) { throw "Missing runtime files: $($missing -join ', ')" }
if ($runtime.Count -ne @($runtime | Sort-Object -Unique).Count) {
  throw "package-files.json contains duplicate entries."
}

$outputDirectory = Split-Path -Parent $zipPath
if (-not (Test-Path -LiteralPath $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$fixedTimestamp = [DateTimeOffset]::new(2000, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
$fileStream = [IO.File]::Open($zipPath, [IO.FileMode]::Create, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
try {
  $archive = [IO.Compression.ZipArchive]::new(
    $fileStream,
    [IO.Compression.ZipArchiveMode]::Create,
    $false
  )
  try {
    foreach ($relativePath in $runtime) {
      $sourcePath = Join-Path $root $relativePath
      $entryName = $relativePath.Replace("\", "/")
      $entry = $archive.CreateEntry($entryName, [IO.Compression.CompressionLevel]::Optimal)
      $entry.LastWriteTime = $fixedTimestamp
      $inputStream = [IO.File]::OpenRead($sourcePath)
      $entryStream = $entry.Open()
      try {
        $inputStream.CopyTo($entryStream)
      } finally {
        $entryStream.Dispose()
        $inputStream.Dispose()
      }
    }
  } finally {
    $archive.Dispose()
  }
} finally {
  $fileStream.Dispose()
}

$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
$size = [Math]::Round((Get-Item -LiteralPath $zipPath).Length / 1KB, 1)
Write-Host "Built $zipPath ($size KB, $($runtime.Count) files)" -ForegroundColor Green
Write-Host "SHA256 $hash" -ForegroundColor Green
