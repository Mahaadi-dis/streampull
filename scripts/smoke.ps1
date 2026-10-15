# Starts the app the way a first-time user on an Arabic Windows machine would: empty data folder, and the
# data / temp / download folders all named in Arabic (as with an Arabic user name). Then runs scripts/smoke.mjs
# against it and exits with its result.
#
#   pwsh scripts/smoke.ps1 -Exe release\win-unpacked\StreamPull.exe
#   pwsh scripts/smoke.ps1 -Exe node_modules\electron\dist\electron.exe -AppArgs '.'
param(
  [Parameter(Mandatory = $true)][string]$Exe,
  [string[]]$AppArgs = @(),
  [int]$Port = 9334
)
$ErrorActionPreference = 'Stop'

# Arabic words built from code points so the script file itself stays ASCII (no encoding surprises on CI).
function Ar([int[]]$cp) { -join ($cp | ForEach-Object { [char]$_ }) }
$user = Ar 0x645, 0x633, 0x62A, 0x62E, 0x62F, 0x645                       # user
$dataName = Ar 0x628, 0x64A, 0x627, 0x646, 0x627, 0x62A                   # data
$tempName = Ar 0x645, 0x624, 0x642, 0x62A                                 # temp
$dlName = Ar 0x627, 0x644, 0x62A, 0x646, 0x632, 0x64A, 0x644, 0x627, 0x62A # downloads

$base = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { $env:TEMP }
$root = Join-Path (Join-Path $base ('smoke-' + [guid]::NewGuid().ToString('N').Substring(0, 8))) $user
$data = Join-Path $root $dataName
$tmp = Join-Path $root $tempName
$dl = Join-Path $root $dlName
New-Item -ItemType Directory -Force $data, $tmp, $dl | Out-Null
Write-Host "Data folder: $data"

# The app (and the yt-dlp it launches, which unpacks itself into TEMP) gets the Arabic-named temp folder.
$oldTemp = $env:TEMP; $oldTmp = $env:TMP
$env:TEMP = $tmp; $env:TMP = $tmp
$argList = @($AppArgs) + @("`"--user-data-dir=$data`"", "--remote-debugging-port=$Port", '--lang=ar-SA')
$proc = Start-Process -FilePath $Exe -ArgumentList $argList -PassThru
$env:TEMP = $oldTemp; $env:TMP = $oldTmp

$code = 1
try {
  $env:SMOKE_USERDATA = $data
  $env:SMOKE_DOWNLOADS = $dl
  & node (Join-Path $PSScriptRoot 'smoke.mjs') $Port
  $code = $LASTEXITCODE
}
finally {
  if ($proc -and -not $proc.HasExited) { & taskkill /PID $proc.Id /T /F | Out-Null }
}
exit $code
