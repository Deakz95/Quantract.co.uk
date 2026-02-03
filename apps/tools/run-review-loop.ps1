$review = "apps\handoff\review.md"
Write-Host "Watching $review..."

$last = ""

while ($true) {
  if (Test-Path $review) {
    $content = Get-Content $review -Raw
    if ($content -ne $last) {
      $last = $content
      Write-Host "Review changed -> calling GPT reviewer..."
      node tools/reviewer.mjs
    }
  }
  Start-Sleep -Seconds 2
}
