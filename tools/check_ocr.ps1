param(
    [string]$FrameDirectory = (Join-Path $PSScriptRoot '..\qa\frames'),
    [string]$ReportPath = (Join-Path $PSScriptRoot '..\qa\ocr.json')
)

# Run with Windows PowerShell 5.1 and the installed Chinese OCR language pack.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime

$null = [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
$ocrType = [Windows.Media.Ocr.OcrEngine,Windows.Media.Ocr,ContentType=WindowsRuntime]
$resultType = [Windows.Media.Ocr.OcrResult,Windows.Media.Ocr,ContentType=WindowsRuntime]
$language = [Windows.Globalization.Language,Windows.Globalization,ContentType=WindowsRuntime]::new('zh-Hans-CN')
$engine = $ocrType::TryCreateFromLanguage($language)
if (-not $engine) { throw 'Simplified Chinese Windows OCR is unavailable.' }

$convert = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $params = $_.GetParameters()
    $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $params.Count -eq 1 -and $params[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1

function Receive-RuntimeResult($Operation, [type]$Type) {
    $task = $convert.MakeGenericMethod($Type).Invoke($null, @($Operation))
    $task.Wait()
    return $task.Result
}

$images = @(Get-ChildItem -LiteralPath $FrameDirectory -File | Where-Object {
    $_.Extension -eq '.jpg' -and $_.Name -notlike 'sheet-*' -or $_.Name -match '^frame-\d{3}\.png$'
} | Sort-Object Name)
if ($images.Count -lt 20) { throw 'The MP4 frame collection is incomplete.' }
$terms = Get-Content -Raw -Encoding utf8 (Join-Path $PSScriptRoot 'audit_terms.json') | ConvertFrom-Json
$identity = $terms.identity -join '|'
$template = $terms.template -join '|'
$results = foreach ($image in $images) {
    $file = Receive-RuntimeResult ([Windows.Storage.StorageFile]::GetFileFromPathAsync($image.FullName)) ([Windows.Storage.StorageFile])
    $stream = Receive-RuntimeResult ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $bitmap = $null
    try {
        $decoder = Receive-RuntimeResult ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bitmap = Receive-RuntimeResult ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        $recognized = Receive-RuntimeResult ($engine.RecognizeAsync($bitmap)) $resultType
        $text = ($recognized.Lines | ForEach-Object Text) -join "`n"
        [pscustomobject]@{
            file=$image.Name
            hasSensitiveText=($text -match $identity -or ($text -replace '\s','') -match $identity -or $text -match $template)
            text=$text
        }
    } finally {
        if ($bitmap) { $bitmap.Dispose() }
        $stream.Dispose()
    }
}

[IO.File]::WriteAllText($ReportPath, (ConvertTo-Json -InputObject @($results) -Depth 4))
if (@($results | Where-Object hasSensitiveText).Count -gt 0) { throw 'A frame has possible identifying text. Review qa/ocr.json.' }
if (@($results | Where-Object { $_.text.Length -lt 24 }).Count -gt 0) { throw 'OCR produced insufficient text on at least one frame.' }
"OCR checked $($images.Count) MP4 frames."
