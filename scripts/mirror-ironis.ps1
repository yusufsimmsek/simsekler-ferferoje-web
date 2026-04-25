$ErrorActionPreference = "Stop"

$baseUri = [Uri]"https://ironis-wcopilot.webflow.io"
$workspaceRoot = Split-Path -Parent $PSScriptRoot
$assetsDir = Join-Path $workspaceRoot "assets"
$cssUrl = "https://cdn.prod.website-files.com/688b105b2269d2924df670a4/css/ironis-wcopilot.webflow.shared.9e731ea97.css"
$cssLocalPath = Join-Path $assetsDir "ironis.css"

function Ensure-Directory {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Get-TargetFile {
    param([string]$RoutePath)

    if ([string]::IsNullOrWhiteSpace($RoutePath) -or $RoutePath -eq "/") {
        return Join-Path $workspaceRoot "index.html"
    }

    $relativeRoute = $RoutePath.Trim("/") -replace "/", "\"
    $directory = Join-Path $workspaceRoot $relativeRoute
    Ensure-Directory -Path $directory
    return Join-Path $directory "index.html"
}

function Normalize-Route {
    param(
        [string]$CurrentRoute,
        [string]$Href
    )

    if ([string]::IsNullOrWhiteSpace($Href)) {
        return $null
    }

    if ($Href.StartsWith("#") -or $Href.StartsWith("mailto:") -or $Href.StartsWith("tel:") -or $Href.StartsWith("javascript:", [System.StringComparison]::OrdinalIgnoreCase)) {
        return $null
    }

    $currentUri = [Uri]::new($baseUri, $CurrentRoute)
    $resolvedUri = [Uri]::new($currentUri, $Href)

    if ($resolvedUri.Host -ne $baseUri.Host) {
        return $null
    }

    $path = $resolvedUri.AbsolutePath

    if ([string]::IsNullOrWhiteSpace($path) -or $path -eq "/") {
        return $null
    }

    if ($path -match "\.(?:css|js|json|svg|png|jpe?g|webp|gif|ico|mp4|webm|mov|pdf|xml|txt)$") {
        return $null
    }

    return $path.TrimEnd("/")
}

function Rewrite-Html {
    param([string]$Html)

    $updated = $Html
    $updated = $updated -replace [regex]::Escape($cssUrl), "/assets/ironis.css"
    $updated = $updated -replace "https://ironis-wcopilot\.webflow\.io", ""
    $updated = $updated -replace 'href="/home-4"', 'href="/about-us/"'
    $updated = $updated -replace '(<a href="/home-1" aria-current="page" class="brand w-nav-brand w--current">)', '<a href="/home-1/" aria-current="page" class="brand w-nav-brand w--current">'
    $updated = $updated -replace '(<a href="/home-1" aria-current="page" class="brand-tablet w-nav-brand w--current">)', '<a href="/home-1/" aria-current="page" class="brand-tablet w-nav-brand w--current">'
    $updated = $updated -replace '(<a href="/home-1" aria-current="page" class="w-inline-block w--current">)', '<a href="/home-1/" aria-current="page" class="w-inline-block w--current">'
    if ($updated -notmatch [regex]::Escape('<script src="/assets/local-only.js" defer></script>')) {
        $updated = $updated -replace '</body>', '<script src="/assets/local-only.js" defer></script></body>'
    }

    return $updated
}

Ensure-Directory -Path $assetsDir

Invoke-WebRequest -Uri $cssUrl -UseBasicParsing -OutFile $cssLocalPath

$queue = [System.Collections.Generic.Queue[string]]::new()
$visited = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$discovered = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$skipped = [System.Collections.Generic.List[string]]::new()

$queue.Enqueue("/home-1")

while ($queue.Count -gt 0) {
    $route = $queue.Dequeue()

    if ($visited.Contains($route)) {
        continue
    }

    $visited.Add($route) | Out-Null
    $url = [Uri]::new($baseUri, $route)

    Write-Host "Fetching $($url.AbsoluteUri)"

    try {
        $response = Invoke-WebRequest -Uri $url.AbsoluteUri -UseBasicParsing
    }
    catch {
        Write-Warning "Skipping $route because the page could not be fetched."
        $skipped.Add($route) | Out-Null
        continue
    }

    $html = Rewrite-Html -Html $response.Content

    $targetFile = Get-TargetFile -RoutePath $route
    $targetDir = Split-Path -Parent $targetFile
    Ensure-Directory -Path $targetDir
    Set-Content -LiteralPath $targetFile -Value $html -Encoding utf8

    foreach ($link in $response.Links) {
        $nextRoute = Normalize-Route -CurrentRoute $route -Href $link.href
        if ($null -eq $nextRoute) {
            continue
        }

        if ($discovered.Add($nextRoute)) {
            $queue.Enqueue($nextRoute)
        }
    }
}

$rootIndex = @"
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=/home-1/" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ironis</title>
  </head>
  <body>
    <p>If you are not redirected automatically, <a href="/home-1/">open the homepage</a>.</p>
  </body>
</html>
"@

Set-Content -LiteralPath (Join-Path $workspaceRoot "index.html") -Value $rootIndex -Encoding utf8

Write-Host ""
Write-Host "Generated routes:"
$visited | Sort-Object | ForEach-Object { Write-Host " - $_" }

if ($skipped.Count -gt 0) {
    Write-Host ""
    Write-Host "Skipped routes:"
    $skipped | Sort-Object | ForEach-Object { Write-Host " - $_" }
}
