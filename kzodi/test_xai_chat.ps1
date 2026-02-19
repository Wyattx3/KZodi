$headers = @{}
$headers.Add("Authorization", "Bearer xai-902264eb783f982a7f53aa4b6cdb84f3c959714853046761")
$headers.Add("Content-Type", "application/json")
$headers.Add("User-Agent", "Mozilla/5.0")

$body = '{"model": "grok-beta", "messages": [{"role": "user", "content": "Hello, are you working?"}]}'

try {
    Write-Host "Testing xAI Chat API (grok-beta)..."
    $response = Invoke-RestMethod -Uri "https://api.x.ai/v1/chat/completions" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    $response | ConvertTo-Json -Depth 5
}
catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response Body: $($reader.ReadToEnd())"
    }
}
