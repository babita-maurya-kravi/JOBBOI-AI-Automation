Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "docker-compose command nahi mila. Docker Desktop install/start karke retry karein." -ForegroundColor Red
    exit 1
}

try {
    docker info *> $null
} catch {
    Write-Host "Docker engine running nahi hai. Docker Desktop start karke phir .\run.ps1 chalayein." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ".env.example se .env bana diya. Zarurat ho to OPENAI_API_KEY update kar dein." -ForegroundColor Yellow
}

Write-Host "JobBot AI start ho raha hai..." -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://127.0.0.1:8001/docs"
Write-Host "Stop karne ke liye Ctrl+C dabayein."

docker-compose up --build
