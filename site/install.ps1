$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Set-StrictMode -Version Latest

$installerUrl = 'https://github.com/wevm/frog/releases/latest/download/install.ps1'
$installDir = [Environment]::GetEnvironmentVariable('FROG_INSTALL_DIR')
if (-not $installDir) { $installDir = $env:INSTALL_DIR }
if (-not $installDir) { $installDir = Join-Path $HOME '.local\bin' }
$installDir = [IO.Path]::GetFullPath($installDir)
[Net.ServicePointManager]::SecurityProtocol =
  [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$previousInstallDir = [Environment]::GetEnvironmentVariable('FROG_INSTALL_DIR')
try {
  $env:FROG_INSTALL_DIR = $installDir
  $response = Invoke-WebRequest -UseBasicParsing -Uri $installerUrl
  & ([ScriptBlock]::Create($response.Content))
} finally {
  $env:FROG_INSTALL_DIR = $previousInstallDir
}

& (Join-Path $installDir 'frog.exe') init
if ($LASTEXITCODE -ne 0) { throw "frog init failed with exit code $LASTEXITCODE." }
