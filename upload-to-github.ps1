# KZodi Project - GitHub Upload Script
# Git install ပြီးနောက် ဒီ script ကို run ပါ

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot

Write-Host "=== KZodi GitHub Upload ===" -ForegroundColor Cyan
Write-Host ""

# Git ရှိမရှိစစ်သည်
try {
    $gitVersion = git --version
    Write-Host "Git Found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Git မတွေ့ပါ။ Git ကို စတင်ပါ - https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

Set-Location $projectRoot

# Git init (အကယ်၍မရှိသေးပါက)
if (-not (Test-Path ".git")) {
    Write-Host "Git repository စတင်နေသည်..." -ForegroundColor Yellow
    git init
    Write-Host "Git init ပြီးပါပြီ" -ForegroundColor Green
} else {
    Write-Host "Git repository ရှိပြီးသား" -ForegroundColor Green
}

# Remote add (အကယ်၍မရှိသေးပါက)
$remoteUrl = "https://github.com/Wyattx3/KZodi.git"
$remoteExists = git remote -v 2>$null | Select-String "origin"

if (-not $remoteExists) {
    Write-Host "Remote origin ထည့်နေသည်..." -ForegroundColor Yellow
    git remote add origin $remoteUrl
    Write-Host "Remote add ပြီးပါပြီ" -ForegroundColor Green
} else {
    Write-Host "Remote origin ရှိပြီးသား - URL ကို update လုပ်နေသည်..." -ForegroundColor Yellow
    git remote set-url origin $remoteUrl
}

# Root .gitignore ဖန်တီးမည် (kzodi folder အတွက်)
$rootGitignore = @"
# KZodi Project
node_modules/
.next/
out/
build/
.env*.local
.env
.DS_Store
*.log
.vercel
"@

if (-not (Test-Path ".gitignore")) {
    Write-Host "Root .gitignore ဖန်တီးနေသည်..." -ForegroundColor Yellow
    $rootGitignore | Out-File -FilePath ".gitignore" -Encoding utf8
}

# Files add လုပ်ပြီး commit
Write-Host "`nFiles များကို add လုပ်နေသည်..." -ForegroundColor Yellow
git add .

$status = git status --short
$hasCommit = git rev-parse HEAD 2>$null

if ([string]::IsNullOrWhiteSpace($status) -and $hasCommit) {
    Write-Host "ပြီးသား changes မရှိပါ - push ပဲလုပ်ပါမည်" -ForegroundColor Cyan
} elseif (-not [string]::IsNullOrWhiteSpace($status)) {
    git commit -m "Initial commit: KZodi - Zodiac Compatibility App"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Commit ပြီးပါပြီ" -ForegroundColor Green
    }
}

# Branch စစ်ဆေးပြီး push
$branch = git branch --show-current 2>$null
if (-not $branch) { $branch = "main" }
$canPush = git rev-parse HEAD 2>$null
if ($canPush) {
    Write-Host "`nGitHub သို့ push လုပ်နေသည်..." -ForegroundColor Yellow
    Write-Host "Branch: $branch" -ForegroundColor Cyan
    git push -u origin $branch
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n=== SUCCESS ===" -ForegroundColor Green
        Write-Host "Project ကို GitHub သို့ upload ပြီးပါပြီ!" -ForegroundColor Green
        Write-Host "https://github.com/Wyattx3/KZodi" -ForegroundColor Cyan
    } else {
        Write-Host "`nPush မအောင်မြင်ပါ။" -ForegroundColor Red
        Write-Host "GitHub မှာ authentication လုပ်ပါ (SSH key သို့မဟုတ် Personal Access Token)" -ForegroundColor Yellow
    }
} else {
    Write-Host "`nBranch မရှိပါ။ အရင်ဆုံး commit လုပ်ပါ" -ForegroundColor Yellow
}

Write-Host ""
