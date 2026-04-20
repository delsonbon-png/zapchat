# ZapChat - Servidor HTTP + HTTPS (HttpListener)
$httpPort = 8081
$httpsPort = 8443
$root = (Resolve-Path "c:\Users\User\Desktop\chat").Path

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".webp" = "image/webp"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".webm" = "video/webm"
    ".mp3"  = "audio/mpeg"
    ".ogg"  = "audio/ogg"
}

$listener = New-Object System.Net.HttpListener

# Adicionar HTTP
$listener.Prefixes.Add("http://+:$httpPort/")

# Tentar adicionar HTTPS (se certificado estiver configurado)
$hasSSL = $false
try {
    $sslCheck = netsh http show sslcert ipport=0.0.0.0:$httpsPort 2>&1
    if ($sslCheck -match "Hash do certificado") {
        $listener.Prefixes.Add("https://+:$httpsPort/")
        $hasSSL = $true
    }
} catch {}

try {
    $listener.Start()
} catch {
    Write-Warning "Erro ao iniciar: $($_.Exception.Message)"
    Write-Warning "Tente rodar como Administrador!"
    exit 1
}

# Obter IP local
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" -and $_.IPAddress -ne "127.0.0.1" } | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ZapChat Server Ativo!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  HTTP:" -ForegroundColor Yellow
Write-Host "    Local:  http://localhost:$httpPort/" -ForegroundColor Cyan
if ($ip) {
    Write-Host "    Rede:   http://${ip}:$httpPort/" -ForegroundColor Cyan
}

if ($hasSSL) {
    Write-Host ""
    Write-Host "  HTTPS (microfone funciona):" -ForegroundColor Yellow
    Write-Host "    Local:  https://localhost:$httpsPort/" -ForegroundColor Cyan
    if ($ip) {
        Write-Host "    Rede:   https://${ip}:$httpsPort/" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "  No celular, use o link HTTPS para o microfone funcionar." -ForegroundColor Magenta
    Write-Host "  Aceite o aviso de certificado no navegador." -ForegroundColor Magenta
} else {
    Write-Host ""
    Write-Host "  HTTPS nao configurado." -ForegroundColor DarkYellow
    Write-Host "  Para microfone no celular, rode: setup-ssl.ps1 (como Admin)" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "  Pressione Ctrl+C para encerrar" -ForegroundColor Yellow
Write-Host ""

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        try {
            $path = $request.Url.LocalPath
            if ($path -eq "/") { $path = "/index.html" }
            
            $fullPath = Join-Path $root ($path -replace "/", "\")
            
            if (Test-Path $fullPath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
                
                $contentType = "application/octet-stream"
                if ($mimeTypes.ContainsKey($ext)) { $contentType = $mimeTypes[$ext] }
                
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.StatusCode = 200
                $response.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                Write-Host "  200 $path" -ForegroundColor DarkGray
            } else {
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.StatusCode = 404
                $response.ContentLength64 = $msg.Length
                $response.OutputStream.Write($msg, 0, $msg.Length)
                Write-Host "  404 $path" -ForegroundColor Red
            }
        } catch {
            Write-Warning "  Erro: $($_.Exception.Message)"
        } finally {
            $response.Close()
        }
    }
} finally {
    $listener.Stop()
    Write-Host "Servidor encerrado."
}
