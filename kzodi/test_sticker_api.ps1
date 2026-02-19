$headers = @{}
$headers.Add("Authorization", "Bearer 4edb1ce0380be0b1c282b3ea001af5487e1ba8756cc6dc5176c4bc2f0190f3cb")
$headers.Add("Content-Type", "application/json")
$body = '{"model": "google/flash-image-2.5", "prompt": "a cute cat sticker", "n": 1, "response_format": "b64_json", "width": 512, "height": 512}'
try {
    Write-Host "Sending request to Together AI..."
    $response = Invoke-RestMethod -Uri "https://api.together.xyz/v1/images/generations" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    $response | ConvertTo-Json -Depth 5
}
catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        Write-Host "Status Code: " + $_.Exception.Response.StatusCode.value__
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $content = $reader.ReadToEnd()
        Write-Host "Response Body: $content"
    }
}
