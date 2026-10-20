param(
  [string]$DbHost = "localhost",
  [string]$DbPort = "5432",
  [string]$DbName = "inventory_ai",
  [string]$DbUser = "postgres"
)

Write-Host "Running local DB setup..." -ForegroundColor Cyan
Write-Host "Target: $DbUser@$DbHost`:$DbPort/$DbName"

$env:PGHOST = $DbHost
$env:PGPORT = $DbPort
$env:PGDATABASE = $DbName
$env:PGUSER = $DbUser

psql -v ON_ERROR_STOP=1 -f "./migrations/001_init.sql"
psql -v ON_ERROR_STOP=1 -f "./migrations/002_phase2_party_templates_billing.sql"
psql -v ON_ERROR_STOP=1 -f "./migrations/003_phase3_voice_ai_drafts.sql"
psql -v ON_ERROR_STOP=1 -f "./seed/seed_local.sql"

Write-Host "Database migrations and seeds completed successfully." -ForegroundColor Green
