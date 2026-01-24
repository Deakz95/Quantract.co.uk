param(
  [string]$BaseUrl = $(if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:3000" }),
  # prod safety: default is READ ONLY unless you explicitly enable writes
  [bool]$WriteMode = $(if ($env:SMOKE_WRITE_MODE) { $env:SMOKE_WRITE_MODE -eq "1" } else { $false }),
  [int]$TimeoutSec = 30,

  # creds come from env (recommended) or fall back to demo defaults
  [string]$AdminEmail    = $(if ($env:SMOKE_ADMIN_EMAIL)    { $env:SMOKE_ADMIN_EMAIL }    else { "admin@demo.quantract" }),
  [string]$AdminPassword = $(if ($env:SMOKE_ADMIN_PASSWORD) { $env:SMOKE_ADMIN_PASSWORD } else { "Password123!" }),

  [string]$EngineerEmail    = $(if ($env:SMOKE_ENGINEER_EMAIL)    { $env:SMOKE_ENGINEER_EMAIL }    else { "engineer@demo.quantract" }),
  [string]$EngineerPassword = $(if ($env:SMOKE_ENGINEER_PASSWORD) { $env:SMOKE_ENGINEER_PASSWORD } else { "Password123!" }),

  [string]$ClientEmail    = $(if ($env:SMOKE_CLIENT_EMAIL)    { $env:SMOKE_CLIENT_EMAIL }    else { "client@demo.quantract" }),
  [string]$ClientPassword = $(if ($env:SMOKE_CLIENT_PASSWORD) { $env:SMOKE_CLIENT_PASSWORD } else { "Password123!" })
)

$ErrorActionPreference = "Stop"

function Section([string]$t) { Write-Host ""; Write-Host "== $t ==" }

function New-Session() { New-Object Microsoft.PowerShell.Commands.WebRequestSession }

function Invoke-Json([string]$Method, [string]$Path, $Body, $Session) {
  $uri = "$BaseUrl$Path"
  $json = $null
  if ($Body -ne $null) { $json = ($Body | ConvertTo-Json -Depth 20) }

  try {
    $resp = Invoke-WebRequest -Method $Method -Uri $uri -WebSession $Session `
      -TimeoutSec $TimeoutSec -ContentType "application/json" -Body $json
    $parsed = $null
    try { $parsed = $resp.Content | ConvertFrom-Json } catch {}
    return @{ Status = [int]$resp.StatusCode; Text = $resp.Content; Json = $parsed }
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $code = [int]$_.Exception.Response.StatusCode
      $body = ""
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
      } catch {}
      $parsed = $null
      try { $parsed = $body | ConvertFrom-Json } catch {}
      return @{ Status = $code; Text = $body; Json = $parsed }
    }
    throw
  }
}

function Assert-Status([string]$Label, [string]$Method, [string]$Path, [int[]]$Expected, $Session) {
  $r = Invoke-Json $Method $Path $null $Session
  $ok = $Expected -contains $r.Status
  $icon = if ($ok) { "✅" } else { "❌" }
  Write-Host ("{0} {1,-10} {2,-6} {3}" -f $icon, $Label, $r.Status, $Path)
  if (-not $ok) {
    $snippet = ""
    if ($null -ne $r.Text) { $snippet = [string]$r.Text }
    if ($snippet.Length -gt 1200) { $snippet = $snippet.Substring(0,1200) }
    throw "Expected [$($Expected -join ",")] but got $($r.Status) for $Method $Path`nBody:`n$snippet"
  }
  return $r
}

function Login([string]$Role, [string]$Email, [string]$Password) {
  $s = New-Session
  $payload = @{ role = $Role; email = $Email; password = $Password }
  $res = Invoke-Json "POST" "/api/auth/password/login" $payload $s
  if ($res.Status -ne 200 -and $res.Status -ne 204) {
    throw "Login failed for $Role ($Email): $($res.Status) $($res.Text)"
  }
  Assert-Status $Role "GET" "/api/auth/me" @(200) $s | Out-Null
  return $s
}

# ---- Read-only "production safe" checks ----
function Run-ReadOnly-Smoke($admin, $engineer, $client) {
  Section "READ-ONLY SMOKE (safe for prod): core 200s + RBAC"

  $adminOk = @(
    "/api/admin/dashboard",
    "/api/admin/jobs",
    "/api/admin/invoices",
    "/api/admin/clients",
    "/api/admin/schedule"
  )

  foreach ($p in $adminOk) { Assert-Status "admin" "GET" $p @(200) $admin | Out-Null }

  # engineer ok + admin forbidden
  $engOk = @("/api/engineer/schedule","/api/engineer/jobs","/api/engineer/timesheets")
  foreach ($p in $engOk) { Assert-Status "engineer" "GET" $p @(200) $engineer | Out-Null }
  Assert-Status "engineer" "GET" "/api/admin/jobs" @(401,403) $engineer | Out-Null

  # client ok + admin forbidden
  $clientOk = @("/api/client/inbox/quotes","/api/client/inbox/invoices")
  foreach ($p in $clientOk) { Assert-Status "client" "GET" $p @(200) $client | Out-Null }
  Assert-Status "client" "GET" "/api/admin/jobs" @(401,403) $client | Out-Null
}

# ---- Full write-mode E2E flow (staging/local) ----
function Run-Full-Wireframe($admin, $engineer, $client) {
  if (-not $WriteMode) {
    Write-Host "WriteMode is OFF. Skipping full lifecycle flow."
    return
  }

  Section "FULL WIRE-FRAME FLOW (writes): quote -> accept -> job -> assign -> cert -> engineer complete -> issue -> invoice -> paid"

  $runId = (Get-Date).ToString("yyyyMMdd-HHmmss")
  $clientName = "Smoke Client $runId"
  $clientEmail = "smoke.client+$runId@example.com"

  # 1) Admin creates quote
  $qRes = Invoke-Json "POST" "/api/admin/quotes" @{
    clientName = $clientName
    clientEmail = $clientEmail
    siteAddress = "Smoke Address $runId"
    notes = "Smoke run $runId"
    vatRate = 0.2
    items = @(@{ description="Labour"; qty=1; unitPrice=100 })
  } $admin

  if ($qRes.Status -ne 200) { throw "Create quote failed: $($qRes.Status) $($qRes.Text)" }
  $quote = $qRes.Json.quote
  if (-not $quote) { throw "Create quote: missing quote in response" }
  $quoteId = $quote.id
  $quoteToken = $quote.token
  if (-not $quoteId -or -not $quoteToken) { throw "Create quote: missing id/token" }
  Write-Host "✅ Quote created: id=$quoteId token=$quoteToken"

  # 2) Client accepts quote via token endpoint (public)
  Assert-Status "public" "POST" "/api/client/quotes/$quoteToken/accept" @(200) $client | Out-Null
  Write-Host "✅ Quote accepted (token)"

  # 3) Admin creates/ensures job for quote
  $jobRes = Invoke-Json "POST" "/api/admin/jobs" @{ quoteId = $quoteId } $admin
  if ($jobRes.Status -ne 200) { throw "Ensure job failed: $($jobRes.Status) $($jobRes.Text)" }
  $job = $jobRes.Json.job
  if (-not $job) { throw "Ensure job: missing job in response" }
  $jobId = $job.id
  if (-not $jobId) { throw "Ensure job: missing jobId" }
  Write-Host "✅ Job ensured: id=$jobId"

  # 4) Admin assigns engineer
  $patchJob = Invoke-Json "PATCH" "/api/admin/jobs/$jobId" @{ engineerEmail = $EngineerEmail; status = "in_progress" } $admin
  if ($patchJob.Status -ne 200) { throw "Assign engineer failed: $($patchJob.Status) $($patchJob.Text)" }
  Write-Host "✅ Engineer assigned: $EngineerEmail"

  # 5) Admin creates certificate for job
  $certCreate = Invoke-Json "POST" "/api/admin/certificates" @{ jobId = $jobId; type = "electrical" } $admin
  if ($certCreate.Status -ne 200) { throw "Create certificate failed: $($certCreate.Status) $($certCreate.Text)" }
  $cert = $certCreate.Json.certificate
  if (-not $cert) { throw "Create certificate: missing certificate in response" }
  $certId = $cert.id
  if (-not $certId) { throw "Create certificate: missing id" }
  Write-Host "✅ Certificate created: id=$certId"

  # 6) Engineer adds signatures (so completion readiness passes)
  $nowIso = (Get-Date).ToUniversalTime().ToString("o")
  $sigPatch = @{
    data = @{
      signatures = @{
        engineer = @{ name = "Smoke Engineer"; signatureText = "Smoke Engineer"; signedAtISO = $nowIso }
        customer = @{ name = "Smoke Customer"; signatureText = "Smoke Customer"; signedAtISO = $nowIso }
      }
    }
  }
  $certPatch = Invoke-Json "PATCH" "/api/engineer/certificates/$certId" $sigPatch $engineer
  if ($certPatch.Status -ne 200) { throw "Engineer cert PATCH failed: $($certPatch.Status) $($certPatch.Text)" }
  Write-Host "✅ Engineer signatures added"

  # 7) Engineer completes certificate
  Assert-Status "engineer" "POST" "/api/engineer/certificates/$certId/complete" @(200) $engineer | Out-Null
  Write-Host "✅ Certificate completed by engineer"

  # 8) Admin issues certificate (email send is non-fatal in API)
  Assert-Status "admin" "POST" "/api/admin/certificates/$certId/issue" @(200) $admin | Out-Null
  Write-Host "✅ Certificate issued by admin"

  # 9) Admin creates invoice for quote
  $invRes = Invoke-Json "POST" "/api/admin/quotes/$quoteId/invoice" $null $admin
  if ($invRes.Status -ne 200) { throw "Create invoice failed: $($invRes.Status) $($invRes.Text)" }
  $invoice = $invRes.Json.invoice
  if (-not $invoice) { throw "Invoice response missing invoice" }
  $invoiceId = $invoice.id
  if (-not $invoiceId) { throw "Invoice missing id" }
  Write-Host "✅ Invoice ensured: id=$invoiceId"

  # 10) Mark invoice status transitions (if your system supports these strings)
  # If your repo uses different statuses, change them here.
  $sent = Invoke-Json "PATCH" "/api/admin/invoices/$invoiceId" @{ status = "sent" } $admin
  if ($sent.Status -ne 200) { throw "Set invoice sent failed: $($sent.Status) $($sent.Text)" }
  $paid = Invoke-Json "PATCH" "/api/admin/invoices/$invoiceId" @{ status = "paid" } $admin
  if ($paid.Status -ne 200) { throw "Set invoice paid failed: $($paid.Status) $($paid.Text)" }
  Write-Host "✅ Invoice status moved to sent -> paid"

  # 11) Sanity GET key pages
  Assert-Status "admin" "GET" "/api/admin/jobs/$jobId/finance-overview" @(200) $admin | Out-Null
  Assert-Status "admin" "GET" "/api/admin/invoices/$invoiceId" @(200) $admin | Out-Null

  Section "FULL FLOW COMPLETE"
}

# ===== RUN =====
Section "LOGIN"
$admin    = Login "admin"    $AdminEmail    $AdminPassword
$engineer = Login "engineer" $EngineerEmail $EngineerPassword
$client   = Login "client"   $ClientEmail   $ClientPassword

Run-ReadOnly-Smoke $admin $engineer $client
Run-Full-Wireframe $admin $engineer $client

Section "DONE"
Write-Host "All enabled smoke checks passed."
Write-Host ("WriteMode=" + ($(if ($WriteMode) { "ON" } else { "OFF" })) + "  BaseUrl=$BaseUrl")
