$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$scriptTag = '<script src="/assets/local-only.js" defer></script>'
$updatedFiles = 0

Get-ChildItem -Path $workspaceRoot -Recurse -Filter index.html | ForEach-Object {
    $path = $_.FullName
    $content = Get-Content -LiteralPath $path -Raw
    $updated = $content

    $updated = $updated -replace 'href="/home-4"', 'href="/about-us/"'

    if ($updated -notmatch [regex]::Escape($scriptTag)) {
        $updated = $updated -replace '</body>', "$scriptTag</body>"
    }

    if ($updated -ne $content) {
        Set-Content -LiteralPath $path -Value $updated -Encoding utf8
        $updatedFiles++
    }
}

Write-Host "Updated files: $updatedFiles"
