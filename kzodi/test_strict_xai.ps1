try {
    Write-Host "--- TEST START: STRICT xAI Mode ---"
    
    $apiKey = "xai-902264eb783f982a7f53aa4b6cdb84f3c959714853046761"
    $headers = @{}
    $headers.Add("Authorization", "Bearer $apiKey")
    $headers.Add("Content-Type", "application/json")
    
    $body = @{
        model           = "grok-2-image"
        prompt          = "a cute robot sticker in vector art style"
        n               = 1
        size            = "1024x1024"
        response_format = "b64_json"
    }
    
    $jsonBody = $body | ConvertTo-Json -Depth 5
    
    Write-Host "Sending request to xAI: https://api.x.ai/v1/images/generations"
    Write-Host "Model: grok-2-image"
    
    $response = Invoke-RestMethod -Uri "https://api.x.ai/v1/images/generations" -Method Post -Headers $headers -Body $jsonBody -ErrorAction Stop
    
    Write-Host "xAI Success!" -ForegroundColor Green
    Write-Host "Response Keys: $($response.PSObject.Properties.Name -join ', ')"
}
catch {
    Write-Host "xAI FAILED (Strict Mode):" -ForegroundColor Red
    Write-Host "Exception Message: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $content = $reader.ReadToEnd()
        Write-Host "Raw Response Body:"
        Write-Host $content -ForegroundColor Yellow
        
        if ($content -match "<html") {
            Write-Host "`nAnalysis: The response is HTML, which confirms the API endpoint is hitting a web gateway or login page instead of the API itself. This usually means Access Denied to the API endpoint for this key." -ForegroundColor Cyan
        }
    }
}
Write-Host "--- TEST END ---"
