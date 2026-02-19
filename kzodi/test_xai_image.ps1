$headers = @{}
$headers.Add("Authorization", "Bearer xai-902264eb783f982a7f53aa4b6cdb84f3c959714853046761")
$headers.Add("Content-Type", "application/json")
$body = '{"model": "grok-2-image", "prompt": "a cute cat sticker", "n": 1, "size": "1024x1024", "response_format": "b64_json"}'
try {
    Write-Host "Sending request to xAI Grok API (grok-2-image)..."
    $response = Invoke-RestMethod -Uri "https://api.x.ai/v1/images/generations" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    $response | ConvertTo-Json -Depth 5
}
catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response Body: $($reader.ReadToEnd())"
    }
}
