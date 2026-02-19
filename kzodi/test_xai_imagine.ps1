$headers = @{}
$headers.Add("Authorization", "Bearer xai-902264eb783f982a7f53aa4b6cdb84f3c959714853046761")
$headers.Add("Content-Type", "application/json")
$body = '{"model": "grok-imagine-image", "prompt": "Create levi chibi sticker\n", "n": 1, "aspect_ratio": "auto", "resolution": "1k"}'
try {
    Write-Host "Sending request to xAI Grok API (grok-imagine-image)..."
    $response = Invoke-RestMethod -Uri "https://api.x.ai/v1/images/generations" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    $response | ConvertTo-Json -Depth 5
}
catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response Body: $($reader.ReadToEnd())"
    }
    else {
        Write-Host "Exception Message: $($_.Exception.Message)"
    }
}
