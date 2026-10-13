Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Test-DockerReady {
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        return $false
    }

    try {
        docker info *> $null
        return $true
    } catch {
        return $false
    }
}

function Get-LocalPython {
    $rootVenvPython = Join-Path $root ".venv\Scripts\python.exe"
    $backendVenvPython = Join-Path $root "backend\.venv\Scripts\python.exe"

    if (Test-Path $rootVenvPython) {
        return $rootVenvPython
    }

    if (Test-Path $backendVenvPython) {
        return $backendVenvPython
    }

    if (Get-Command py -ErrorAction SilentlyContinue) {
        return "py -3.13"
    }

    return "python"
}

function Start-LocalApp {
    $backendDir = Join-Path $root "backend"
    $frontendDir = Join-Path $root "frontend"
    $logDir = Join-Path $root ".run-logs"
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null

    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        Write-Host "npm.cmd nahi mila. Node.js install karke retry karein." -ForegroundColor Red
        exit 1
    }

    $pythonCommand = Get-LocalPython
    $pythonCheck = "$pythonCommand -c ""import fastapi, uvicorn, sqlalchemy"""
    $dependenciesReady = $false
    try {
        Invoke-Expression $pythonCheck *> $null
        $dependenciesReady = $true
    } catch {
        $dependenciesReady = $false
    }

    if (-not $dependenciesReady) {
        Write-Host "Backend dependencies install ho rahi hain..." -ForegroundColor Yellow
        Push-Location $backendDir
        try {
            Invoke-Expression "$pythonCommand -m pip install -r requirements.txt"
        } finally {
            Pop-Location
        }
    }

    if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
        Write-Host "Frontend dependencies install ho rahi hain..." -ForegroundColor Yellow
        Push-Location $frontendDir
        try {
            npm.cmd install
        } finally {
            Pop-Location
        }
    }

    $backendLog = Join-Path $logDir "backend.log"
    $backendErrorLog = Join-Path $logDir "backend-error.log"
    if (Test-Path $backendLog) { Remove-Item -LiteralPath $backendLog -Force }
    if (Test-Path $backendErrorLog) { Remove-Item -LiteralPath $backendErrorLog -Force }

    Write-Host "JobBot AI local mode me start ho raha hai..." -ForegroundColor Cyan
    Write-Host "Frontend: http://localhost:5173"
    Write-Host "Backend:  http://127.0.0.1:8001/docs"
    Write-Host "Backend logs: $backendLog"
    Write-Host "Stop karne ke liye Ctrl+C dabayein."

    $backendProcess = Start-Process `
        -FilePath "powershell" `
        -ArgumentList @(
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            "Set-Location '$backendDir'; $pythonCommand -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001"
        ) `
        -RedirectStandardOutput $backendLog `
        -RedirectStandardError $backendErrorLog `
        -PassThru `
        -WindowStyle Hidden

    try {
        Push-Location $frontendDir
        npm.cmd run dev
    } finally {
        Pop-Location
        if ($backendProcess -and -not $backendProcess.HasExited) {
            Stop-Process -Id $backendProcess.Id -Force
        }
    }
}

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host ".env.example se .env bana diya. Zarurat ho to OPENAI_API_KEY update kar dein." -ForegroundColor Yellow
    }
}

if (Test-DockerReady) {
    Write-Host "JobBot AI Docker mode me start ho raha hai..." -ForegroundColor Cyan
    Write-Host "Frontend: http://localhost:5173"
    Write-Host "Backend:  http://127.0.0.1:8001/docs"
    Write-Host "Stop karne ke liye Ctrl+C dabayein."

    docker-compose up --build
} else {
    Write-Host "Docker ready nahi hai, local mode use kar rahe hain." -ForegroundColor Yellow
    Start-LocalApp
}
