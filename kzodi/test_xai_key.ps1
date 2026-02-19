$headers = @{}
$headers.Add("Authorization", "Bearer xai-902264eb783f982a7f53aa4b6cdb84f3c959714853046761")
$headers.Add("Content-Type", "application/json")

try {
    Write-Host "Testing xAI Key validity on /v1/models..."
    $response = Invoke-RestMethod -Uri "https://api.x.ai/v1/models" -Method Get -Headers $headers -ErrorAction Stop
    $response | ConvertTo-Json -Depth 5
}
catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response Body: $($reader.ReadToEnd())"
    }
}
