$xaiApiKey = "xai-902264eb783f982a7f53aa4b6cdb84f3c959714853046761"
$prompt = "chibi sticker of Levi Ackerman, angry, anime style, vector, white background"
$encodedPrompt = [Uri]::EscapeDataString($prompt)

Write-Host "--- TEST START: Simulate /api/sticker Logic ---"
Write-Host "1. Attempting xAI Grok (grok-2-image)..."

$headers = @{}
$headers.Add("Authorization", "Bearer $xaiApiKey")
$headers.Add("Content-Type", "application/json")
$body = '{"model": "grok-2-image", "prompt": "' + $prompt + '", "n": 1, "size": "1024x1024", "response_format": "b64_json"}'

try {
    $response = Invoke-RestMethod -Uri "https://api.x.ai/v1/images/generations" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "xAI Success!" -ForegroundColor Green
    # $response | ConvertTo-Json -Depth 2
}
catch {
    Write-Host "xAI Failed as expected (most likely 403/402): $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "xAI Response Body: $($reader.ReadToEnd())" -ForegroundColor Red
    }
    
    Write-Host "`n2. Triggering Fallback to Pollinations.ai..."
    $pollUrl = "https://image.pollinations.ai/prompt/$encodedPrompt?width=512&height=512&model=flux&nologo=true"
    
    try {
        $pollResponse = Invoke-WebRequest -Uri $pollUrl -Method Get -ErrorAction Stop
        if ($pollResponse.StatusCode -eq 200) {
            Write-Host "Pollinations.ai Success! Sticker generated." -ForegroundColor Green
            Write-Host "Content-Type: $($pollResponse.Headers['Content-Type'])"
            Write-Host "Content-Length: $($pollResponse.Content.Length) bytes"
        }
        else {
            Write-Host "Pollinations Failed: $($pollResponse.StatusCode)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "Pollinations Exception: $_" -ForegroundColor Red
    }
}

Write-Host "--- TEST END ---"
