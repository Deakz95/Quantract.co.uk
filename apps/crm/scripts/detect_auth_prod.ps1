param(
  [Parameter(Mandatory=$true)][string]$BaseUrl
)

$ErrorActionPreference = "Continue"

function Peek([string]$Method, [string]$Path, $Body=$null) {
  $uri = "$BaseUrl$Path"
  $headers = @{
    "accept" = "application/json, text/plain, */*"
    "user-agent" = "smoke-detector/1.0"
  }

  try {
    if ($Body -ne $null) {
      $json = ($Body | ConvertTo-Json -Depth 10 -Compress)
      $r = Invoke-WebRequest -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body $json -UseBasicParsing
    } else {
      $r = Invoke-WebRequest -Method $Method -Uri $uri -Headers $headers -UseBasicParsing
    }
    $code = [int]$r.StatusCode
    $server = $r.Headers["server"]
    $ct = $r.Headers["content-type"]
    $text = ""
    try { $text = [string]$r.Content } catch {}
    if ($text.Length -gt 240) { $text = $text.Substring(0,240) }

    Write-Host ("{0,-6} {1,-35} {2}  ct={3}  server={4}" -f $Method, $Path, $code, $ct, $server)
    if ($text) { Write-Host ("         body: {0}" -f ($text -replace "\s+"," ")) }
    return $code
  } catch {
    $resp = $_.Exception.Response
    if ($resp -and $resp.StatusCode) {
      $code = [int]$resp.StatusCode
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $body = $reader.ReadToEnd()
      if ($body.Length -gt 240) { $body = $body.Substring(0,240) }
      Write-Host ("{0,-6} {1,-35} {2}" -f $Method, $Path, $code)
      if ($body) { Write-Host ("         body: {0}" -f ($body -replace "\s+"," ")) }
      return $code
    } else {
      Write-Host ("{0,-6} {1,-35} ERR {2}" -f $Method, $Path, $_.Exception.Message)
      return -1
    }
  }
}

Write-Host "== Baseline =="
Peek GET  "/api/ai/status" | Out-Null
Peek GET  "/api/auth/me" | Out-Null

Write-Host "`n== Neon Auth proxy endpoints =="
Peek GET  "/api/auth/get-session" | Out-Null
Peek GET  "/api/auth/providers"   | Out-Null
Peek GET  "/api/auth/user"        | Out-Null

Write-Host "`n== Password login endpoint =="
Peek POST "/api/auth/password/login" @{ role="admin"; email="x@y.com"; password="notreal" } | Out-Null

Write-Host "`n== Admin endpoint without auth =="
Peek GET "/api/admin/dashboard" | Out-Null
