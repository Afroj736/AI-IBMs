Write-Host "Inventory AI System local setup" -ForegroundColor Cyan

Write-Host "`n1) Backend dependencies" -ForegroundColor Yellow
Push-Location backend
if (-not (Test-Path ".venv")) {
  python -m venv .venv
}
.\.venv\Scripts\activate
pip install -r requirements.txt
Pop-Location

Write-Host "`n2) Database migrations and seed" -ForegroundColor Yellow
Push-Location database
.\setup_local.ps1
Pop-Location

Write-Host "`n3) Frontend dependencies" -ForegroundColor Yellow
Push-Location frontend
npm install
Pop-Location

Write-Host "`nSetup complete. Run backend and frontend in separate terminals." -ForegroundColor Green
