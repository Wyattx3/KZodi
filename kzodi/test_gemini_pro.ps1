$headers = @{}
$headers.Add("Content-Type", "application/json")
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyAfQJJxAisZfO1Wd0YPMkhSu3UKl_w1cWI"
$body = '{ "contents": [{ "parts": [{ "text": "Test" }] }] }'
try {
    Write-Host "Testing Gemini Pro..."
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -ErrorAction Stop
    $response | ConvertTo-Json -Depth 5
}
catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response Body: $($reader.ReadToEnd())"
    }
}
