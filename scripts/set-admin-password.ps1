# Sets ADMIN_PASSWORD in .env.local from a hidden prompt. The password is never printed or logged.
# Usage (from the project folder):  powershell -ExecutionPolicy Bypass -File .\scripts\set-admin-password.ps1
$ErrorActionPreference = 'Stop'
$envFile = Join-Path (Get-Location) '.env.local'
if (-not (Test-Path $envFile)) { Write-Host 'No .env.local in this folder. Run this from the project folder.'; exit 1 }

function Read-Plain([string]$prompt) {
  $s = Read-Host -Prompt $prompt -AsSecureString
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}

# The current value (if any), only to refuse reusing it. Never printed.
$current = $null
foreach ($l in [IO.File]::ReadAllLines($envFile)) { if ($l -match '^\s*ADMIN_PASSWORD\s*=\s*(.*)$') { $current = $Matches[1].Trim() } }

# Backup before any change.
Copy-Item $envFile "$envFile.bak" -Force

for ($try = 1; $try -le 3; $try++) {
  $p1 = Read-Plain 'New admin password (9-10 characters; no spaces, quotes, #, $ or \)'
  if ($p1.Length -lt 9 -or $p1.Length -gt 10) { Write-Host "Must be 9-10 characters (you typed $($p1.Length)). Try again."; continue }
  if ($current -and $p1 -ceq $current) { Write-Host "That is the current password, which was shared before. Please choose a new one."; continue }
  # Next.js expands $VAR in .env files and treats ' #' as a comment, so these characters would silently change the value.
  if ($p1 -match '[\s"''#$\\`]') { Write-Host 'Please avoid spaces, quotes, #, $, backslash and backtick. Try again.'; continue }
  $p2 = Read-Plain 'Type it again'
  if ($p1 -ne $p2) { Write-Host 'The two entries did not match. Try again.'; continue }

  $lines = [IO.File]::ReadAllLines($envFile)
  $found = $false
  $out = foreach ($l in $lines) { if ($l -match '^\s*ADMIN_PASSWORD\s*=') { $found = $true; "ADMIN_PASSWORD=$p1" } else { $l } }
  if (-not $found) { $out = @($out) + "ADMIN_PASSWORD=$p1" }
  [IO.File]::WriteAllLines($envFile, $out, (New-Object Text.UTF8Encoding $false))
  $p1 = $null; $p2 = $null; $current = $null
  Write-Host 'ADMIN_PASSWORD updated in .env.local (value not shown). You can close this tab.'
  exit 0
}
Write-Host 'Not changed. Run the script again when ready.'
exit 1
