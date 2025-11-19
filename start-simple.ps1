# Grist-Core 簡化啟動腳本 (Windows PowerShell)
# 此腳本適用於已經完成建置的專案

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Grist-Core Windows 簡易啟動器" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 設定錯誤處理
$ErrorActionPreference = "Stop"

try {
    # 檢查必要的目錄
    Write-Host "[1/5] 檢查專案結構..." -ForegroundColor Yellow

    if (-Not (Test-Path "_build")) {
        Write-Host "錯誤: _build 目錄不存在" -ForegroundColor Red
        Write-Host "請先執行: yarn build" -ForegroundColor Yellow
        exit 1
    }

    if (-Not (Test-Path "node_modules")) {
        Write-Host "錯誤: node_modules 目錄不存在" -ForegroundColor Red
        Write-Host "請先執行: yarn install" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "✓ 專案結構正常" -ForegroundColor Green

    # 檢查 Python 虛擬環境
    Write-Host "[2/5] 檢查 Python 環境..." -ForegroundColor Yellow

    if (-Not (Test-Path "sandbox_venv3")) {
        Write-Host "警告: Python 虛擬環境不存在" -ForegroundColor Yellow
        Write-Host "公式功能可能無法正常運作" -ForegroundColor Yellow
        Write-Host "建議執行: python -m venv sandbox_venv3" -ForegroundColor Cyan
        Write-Host "然後: .\sandbox_venv3\Scripts\Activate.ps1" -ForegroundColor Cyan
        Write-Host "最後: pip install -r sandbox\requirements.txt" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "✓ Python 虛擬環境存在" -ForegroundColor Green
    }

    # 建立必要目錄
    Write-Host "[3/5] 準備資料目錄..." -ForegroundColor Yellow

    if (-Not (Test-Path "persist")) {
        New-Item -ItemType Directory -Path "persist" | Out-Null
    }
    if (-Not (Test-Path "persist\docs")) {
        New-Item -ItemType Directory -Path "persist\docs" | Out-Null
    }

    Write-Host "✓ 資料目錄已準備" -ForegroundColor Green

    # 設定環境變數
    Write-Host "[4/5] 配置環境變數..." -ForegroundColor Yellow

    $env:NODE_PATH = "_build;_build/ext;_build/stubs"
    $env:GRIST_HOST = "0.0.0.0"
    $env:GRIST_SINGLE_PORT = "true"
    $env:GRIST_DATA_DIR = "persist/docs"
    $env:GRIST_INST_DIR = "persist"
    $env:TYPEORM_DATABASE = "persist/home.sqlite3"
    $env:GRIST_SESSION_COOKIE = "grist_dev"
    $env:GRIST_SANDBOX_FLAVOR = "unsandboxed"
    $env:GRIST_SINGLE_ORG = "true"
    $env:GRIST_TEST_LOGIN = "1"
    $env:NODE_ENV = "development"

    Write-Host "✓ 環境變數已設定 (測試登入已啟用)" -ForegroundColor Green

    # 啟動伺服器
    Write-Host "[5/5] 啟動 Grist 伺服器..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "  伺服器即將啟動" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "存取位址: http://localhost:8484" -ForegroundColor Cyan
    Write-Host "按 Ctrl+C 停止伺服器" -ForegroundColor Yellow
    Write-Host ""

    # 啟動 Node.js 伺服器
    node _build/stubs/app/server/server.js

} catch {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host "  發生錯誤" -ForegroundColor Red
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "請檢查:" -ForegroundColor Yellow
    Write-Host "1. 是否已執行 'yarn install'" -ForegroundColor Yellow
    Write-Host "2. 是否已執行 'yarn build'" -ForegroundColor Yellow
    Write-Host "3. Node.js 和 Python 是否正確安裝" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
