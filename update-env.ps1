$envFile = "c:\Users\shree\OneDrive\Desktop\AI Council\.env"
$envLocalFile = "c:\Users\shree\OneDrive\Desktop\AI Council\.env.local"

$newVars = @(
    "NVIDIA_API_KEY=""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""",
    "NVIDIA_GLM_API_KEY=""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""",
    "NVIDIA_MISTRAL_API_KEY=""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""",
    "NVIDIA_DEEPSEEK_API_KEY=""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""",
    "CUSTOM_OLLAMA_API_KEY=""6aedcf8657e14996bfab9f3fdebd1205.Sf3do5GnLjVvdA8k4pgo305e""",
    "CUSTOM_OLLAMA_BASE_URL=""https://open.bigmodel.cn/api/paas/v4/"""
)

function Update-EnvFile {
    param([string]$path)
    
    if (-not (Test-Path $path)) {
        return
    }

    $content = Get-Content $path -Raw
    
    # Remove old keys
    $content = $content -replace '(?m)^OPENAI_API_KEY=.*$', ''
    $content = $content -replace '(?m)^GEMINI_API_KEY=.*$', ''
    $content = $content -replace '(?m)^OPENAI_COMPAT_BASE_URL=.*$', ''
    $content = $content -replace '(?m)^OPENAI_COMPAT_API_KEY=.*$', ''
    $content = $content -replace '(?m)^OPENAI_COMPAT_MODEL_NAME=.*$', ''

    # Append new keys
    $content += "`n" + ($newVars -join "`n")
    
    # Clean up multiple empty lines
    $content = $content -replace '(?m)^\s*$', ''

    Set-Content -Path $path -Value $content
}

Update-EnvFile $envFile
Update-EnvFile $envLocalFile
