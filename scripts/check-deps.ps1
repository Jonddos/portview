# check-deps.ps1 — Verifica que todas las herramientas necesarias estén instaladas
# Uso: .\scripts\check-deps.ps1

$ok = $true

function Check-Tool {
  param([string]$name, [string]$command, [string]$minVersion = "")
  try {
    $version = & $command --version 2>&1 | Select-Object -First 1
    Write-Host "  [OK] $name : $version" -ForegroundColor Green
  } catch {
    Write-Host "  [FALTA] $name — instalar desde las instrucciones del README" -ForegroundColor Red
    $script:ok = $false
  }
}

Write-Host ""
Write-Host "PortView — Verificacion de dependencias" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

Check-Tool "Rust / cargo" "cargo"
Check-Tool "rustup"       "rustup"
Check-Tool "Node.js"      "node"
Check-Tool "pnpm"         "pnpm"

# Tauri CLI puede estar como cargo-tauri
try {
  $tauriVersion = cargo tauri --version 2>&1 | Select-Object -First 1
  Write-Host "  [OK] Tauri CLI : $tauriVersion" -ForegroundColor Green
} catch {
  Write-Host "  [FALTA] Tauri CLI — ejecutar: cargo install tauri-cli --version `"^2`"" -ForegroundColor Red
  $ok = $false
}

Write-Host ""
if ($ok) {
  Write-Host "Todo listo. Puedes iniciar el proyecto con:" -ForegroundColor Green
  Write-Host "  cd ui && pnpm install" -ForegroundColor Yellow
  Write-Host "  cargo tauri dev" -ForegroundColor Yellow
} else {
  Write-Host "Faltan herramientas. Instala las indicadas y vuelve a ejecutar este script." -ForegroundColor Red
}
Write-Host ""
