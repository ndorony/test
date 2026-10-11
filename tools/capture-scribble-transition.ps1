[CmdletBinding()]
param(
    [ValidateRange(0, 100)][double[]]$Progress = @(0, 6, 9, 11.8, 12.2, 14, 18, 25, 32, 39, 50, 65, 80, 95, 100),
    [ValidateRange(320, 7680)][int]$Width = 1280,
    [ValidateRange(240, 4320)][int]$Height = 800,
    [string]$OutputDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) 'screenshots\scribble-transition'),
    [string]$BrowserPath,
    [ValidateRange(1000, 60000)][int]$VirtualTimeBudget = 12000
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scribble-capture-common.ps1')

$repoRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
$browser = Resolve-ScribbleCaptureBrowser -BrowserPath $BrowserPath
$server = $null
$profile = $null

try {
    $server = Start-ScribbleCaptureServer -Root $repoRoot
    $profile = New-ScribbleCaptureProfile
    foreach ($value in $Progress) {
        $progressToken = $value.ToString('000.###', [System.Globalization.CultureInfo]::InvariantCulture).Replace('.', '_')
        $urlValue = $value.ToString('0.###', [System.Globalization.CultureInfo]::InvariantCulture)
        $output = Join-Path $outputRoot "transition-$progressToken.png"
        $url = $server.Url + "tools/scribble-magic-door-preview.html#bare&p=$urlValue"
        Write-Host "Capturing transition at $urlValue% -> $output"
        Invoke-ScribbleCapture -BrowserPath $browser -ProfileDirectory $profile -Url $url `
            -OutputPath $output -Width $Width -Height $Height -VirtualTimeBudget $VirtualTimeBudget
    }
    Write-Host "Captured $($Progress.Count) transition frames in $outputRoot"
} finally {
    Stop-ScribbleCaptureServer -Server $server
    if ($profile) { Remove-ScribbleCaptureProfile -ProfileDirectory $profile }
}
