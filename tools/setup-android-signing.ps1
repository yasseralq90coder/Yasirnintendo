# Run locally in PowerShell. Private signing material never enters the repository.
$ErrorActionPreference = 'Stop'
$repo = 'yasseralq90coder/Yasirnintendo'
foreach ($tool in @('gh','keytool')) {
 if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Missing $tool. Install GitHub CLI and Microsoft OpenJDK 17, then reopen PowerShell." }
}
& gh auth status
if ($LASTEXITCODE -ne 0) { & gh auth login; if ($LASTEXITCODE -ne 0) { throw 'GitHub sign-in failed.' } }
$signingDir = Join-Path $env:USERPROFILE 'YasirNintendo-Signing'
New-Item -ItemType Directory -Force -Path $signingDir | Out-Null
$keyPath = Join-Path $signingDir 'yasir-release.p12'
$certPath = Join-Path $signingDir 'yasir-release.cer'
Write-Host 'Choose/enter your private signing password. Keep it in your password manager.'
$secure = Read-Host 'Signing password' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
 $env:YASIR_SIGNING_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
 if ($env:YASIR_SIGNING_PASSWORD.Length -lt 12) { throw 'Use at least 12 characters.' }
 if (-not (Test-Path $keyPath)) {
  & keytool -genkeypair -keystore $keyPath -storetype PKCS12 -storepass:env YASIR_SIGNING_PASSWORD -keypass:env YASIR_SIGNING_PASSWORD -alias yasir -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Yasir Nintendo'
  if ($LASTEXITCODE -ne 0) { throw 'Key generation failed.' }
 }
 & keytool -exportcert -keystore $keyPath -storepass:env YASIR_SIGNING_PASSWORD -alias yasir -file $certPath
 if ($LASTEXITCODE -ne 0) { throw 'Cannot unlock existing key; no secrets changed.' }
 $fingerprint = (Get-FileHash $certPath -Algorithm SHA256).Hash.ToLowerInvariant()
 $secrets = @{
  ANDROID_KEYSTORE_BASE64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($keyPath))
  ANDROID_KEYSTORE_PASSWORD = $env:YASIR_SIGNING_PASSWORD
  ANDROID_KEY_ALIAS = 'yasir'
  ANDROID_KEY_PASSWORD = $env:YASIR_SIGNING_PASSWORD
  ANDROID_SIGNING_CERT_SHA256 = $fingerprint
 }
 foreach ($name in $secrets.Keys) {
  $info = New-Object System.Diagnostics.ProcessStartInfo
  $info.FileName = (Get-Command gh).Source
  $info.Arguments = "secret set $name --repo $repo"
  $info.UseShellExecute = $false
  $info.RedirectStandardInput = $true
  $process = [System.Diagnostics.Process]::Start($info)
  $process.StandardInput.Write($secrets[$name])
  $process.StandardInput.Close()
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) { throw "Failed to save $name. Rerun with the SAME key and password." }
  $process.Dispose()
 }
 Write-Host "Keep a secure backup of $keyPath and your password. Never delete or replace this key."
 & gh workflow run android-stable.yml --repo $repo
 if ($LASTEXITCODE -ne 0) { throw 'Secrets saved; start Build Android APK from GitHub Actions.' }
 Write-Host 'Signing configured. Android build started; check GitHub Actions.'
} finally {
 [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
 Remove-Item Env:YASIR_SIGNING_PASSWORD -ErrorAction SilentlyContinue
 if ($secrets) { $secrets.Clear() }
}
