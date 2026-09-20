$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$nodeBin = Join-Path ${env:ProgramFiles} 'nodejs'
if (Test-Path $nodeBin) {
    $env:PATH = "$nodeBin;$env:PATH"
}

$dockerExe = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerExe) {
    $dockerExe = Join-Path $env:USERPROFILE 'AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe'
    if (-not (Test-Path $dockerExe)) {
        Write-Error 'Docker Desktop is not installed or not available on PATH. Please install Docker Desktop and start it before running AURORA.'
        exit 1
    }
}

$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    $npmCmd = Join-Path ${env:ProgramFiles} 'nodejs\npm.cmd'
    if (-not (Test-Path $npmCmd)) {
        Write-Error 'Node.js LTS is not installed. Please install Node.js LTS from https://nodejs.org/ and reopen PowerShell.'
        exit 1
    }
}

Write-Host 'Installing dependencies...'
if ($npmCmd.Source) {
    & $npmCmd.Source install --no-fund --no-audit
} else {
    & $npmCmd install --no-fund --no-audit
}

Write-Host ''
Write-Host 'Building and starting AURORA...'
if ($dockerExe.Source) {
    & $dockerExe.Source compose up --build -d
} else {
    & $dockerExe compose up --build -d
}

Write-Host ''
Write-Host 'AURORA is running at http://localhost:3000'
Write-Host 'To stop it: docker compose down'
