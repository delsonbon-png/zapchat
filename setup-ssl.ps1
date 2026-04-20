# ZapChat - Gerar Certificado SSL Auto-Assinado
$certPath = "c:\Users\User\Desktop\chat"

# Obter IP local automaticamente
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" -and $_.IPAddress -ne "127.0.0.1" } | Select-Object -First 1).IPAddress
if (!$localIp) { $localIp = "127.0.0.1" }

Write-Host "Configurando SSL para IP: $localIp" -ForegroundColor Yellow

# Criar certificado auto-assinado
$cert = New-SelfSignedCertificate `
    -DnsName "localhost", $localIp `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -FriendlyName "ZapChat Dev SSL" `
    -NotAfter (Get-Date).AddYears(2) `
    -KeyAlgorithm RSA `
    -KeyLength 2048

Write-Host "Certificado criado: $($cert.Thumbprint)" -ForegroundColor Green

# Exportar para PFX
$pfxPath = Join-Path $certPath "zapchat.pfx"
$password = ConvertTo-SecureString "zapchat123" -AsPlainText -Force
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password | Out-Null
Write-Host "PFX exportado para: $pfxPath" -ForegroundColor Green

# Registrar o certificado na porta 8443 para HTTPS
$appId = [guid]::NewGuid().ToString()
$hash = $cert.Thumbprint

# Remover binding anterior se existir
netsh http delete sslcert ipport=0.0.0.0:8443 2>$null

# Adicionar novo binding
netsh http add sslcert ipport=0.0.0.0:8443 certhash=$hash appid="{$appId}"

Write-Host ""
Write-Host "SSL configurado na porta 8443" -ForegroundColor Green
Write-Host "Thumbprint: $hash" -ForegroundColor Cyan
