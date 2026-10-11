Set-StrictMode -Version Latest

function Resolve-ScribbleCaptureBrowser {
    param([string]$BrowserPath)

    if ($BrowserPath) {
        $resolved = Resolve-Path -LiteralPath $BrowserPath -ErrorAction Stop
        return $resolved.Path
    }

    $candidates = @()
    foreach ($commandName in @('msedge.exe', 'chrome.exe')) {
        $command = Get-Command $commandName -ErrorAction SilentlyContinue
        if ($command) { $candidates += $command.Source }
    }
    $candidates += @(
        (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe')
    )

    $found = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
    if (-not $found) {
        throw 'Could not find Microsoft Edge or Google Chrome. Pass -BrowserPath explicitly.'
    }
    return $found
}

function Start-ScribbleCaptureServer {
    param([Parameter(Mandatory = $true)][string]$Root)

    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    $listener.Stop()

    $python = Get-Command py.exe -ErrorAction SilentlyContinue
    $arguments = @('-3', '-m', 'http.server', $port, '--bind', '127.0.0.1', '--directory', $Root)
    if (-not $python) {
        $python = Get-Command python.exe -ErrorAction SilentlyContinue
        $arguments = @('-m', 'http.server', $port, '--bind', '127.0.0.1', '--directory', $Root)
    }
    if (-not $python) { throw 'Python 3 is required to serve the preview pages.' }

    $process = Start-Process -FilePath $python.Source -ArgumentList $arguments -PassThru -WindowStyle Hidden
    $url = "http://127.0.0.1:$port/"
    $ready = $false
    for ($attempt = 0; $attempt -lt 50; $attempt += 1) {
        if ($process.HasExited) { break }
        try {
            Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1 | Out-Null
            $ready = $true
            break
        } catch {
            Start-Sleep -Milliseconds 100
        }
    }
    if (-not $ready) {
        if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
        throw 'The temporary HTTP server did not become ready.'
    }

    return [pscustomobject]@{Process = $process; Port = $port; Url = $url}
}

function New-ScribbleCaptureProfile {
    $profile = Join-Path ([System.IO.Path]::GetTempPath()) ('scribble-capture-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $profile | Out-Null
    return $profile
}

function Remove-ScribbleCaptureProfile {
    param([Parameter(Mandatory = $true)][string]$ProfileDirectory)

    $resolvedProfile = [System.IO.Path]::GetFullPath($ProfileDirectory)
    $resolvedTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if (-not $resolvedProfile.StartsWith($resolvedTemp, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove capture profile outside the temp directory: $resolvedProfile"
    }
    if (Test-Path -LiteralPath $resolvedProfile) {
        Remove-Item -LiteralPath $resolvedProfile -Recurse -Force
    }
}

function Test-ScribbleCaptureImage {
    param([Parameter(Mandatory = $true)][string]$Path)

    $file = Get-Item -LiteralPath $Path -ErrorAction Stop
    if ($file.Length -lt 4096) { throw "Screenshot is unexpectedly small: $Path" }

    Add-Type -AssemblyName System.Drawing
    $bitmap = [System.Drawing.Bitmap]::new($file.FullName)
    try {
        $colors = [System.Collections.Generic.HashSet[string]]::new()
        foreach ($xPart in 1..31) {
            foreach ($yPart in 1..31) {
                $x = [Math]::Min($bitmap.Width - 1, [Math]::Floor($bitmap.Width * $xPart / 32))
                $y = [Math]::Min($bitmap.Height - 1, [Math]::Floor($bitmap.Height * $yPart / 32))
                $colors.Add($bitmap.GetPixel($x, $y).ToArgb().ToString()) | Out-Null
            }
        }
        if ($colors.Count -lt 3) { throw "Screenshot appears blank or uniform: $Path" }
    } finally {
        $bitmap.Dispose()
    }
}

function Invoke-ScribbleCapture {
    param(
        [Parameter(Mandatory = $true)][string]$BrowserPath,
        [Parameter(Mandatory = $true)][string]$ProfileDirectory,
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][string]$OutputPath,
        [int]$Width = 1280,
        [int]$Height = 800,
        [int]$VirtualTimeBudget = 12000
    )

    $absoluteOutput = [System.IO.Path]::GetFullPath($OutputPath)
    $arguments = @(
        '--headless=new',
        '--no-first-run',
        '--no-default-browser-check',
        '--hide-scrollbars',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--run-all-compositor-stages-before-draw',
        "--user-data-dir=`"$ProfileDirectory`"",
        "--window-size=$Width,$Height",
        "--virtual-time-budget=$VirtualTimeBudget",
        "--screenshot=`"$absoluteOutput`"",
        "`"$Url`""
    )

    $browserProcess = Start-Process -FilePath $BrowserPath -ArgumentList $arguments `
        -PassThru -Wait -WindowStyle Hidden
    if ($browserProcess.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $absoluteOutput)) {
        throw "Browser capture failed for $Url (exit code $($browserProcess.ExitCode))."
    }
    Test-ScribbleCaptureImage -Path $absoluteOutput
}

function Stop-ScribbleCaptureServer {
    param($Server)
    if ($Server -and $Server.Process -and -not $Server.Process.HasExited) {
        Stop-Process -Id $Server.Process.Id -Force
        $Server.Process.WaitForExit()
    }
}
