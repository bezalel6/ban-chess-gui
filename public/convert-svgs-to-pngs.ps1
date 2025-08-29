# PowerShell script to convert chess SVGs to PNGs for both themes
# Robust conversion with proper sizing and color handling

Write-Host "Chess Piece SVG to PNG Converter" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if ImageMagick is installed
if (!(Get-Command magick -ErrorAction SilentlyContinue)) {
    Write-Host "Error: ImageMagick is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install ImageMagick from https://imagemagick.org/script/download.php" -ForegroundColor Yellow
    exit 1
}

# Define pieces
$pieces = @("king", "queen", "rook", "bishop", "knight", "pawn")

# Create directories if they don't exist
$dirs = @(
    "themes/classic/white",
    "themes/classic/black"
)

foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Green
    }
}

Write-Host "`nConverting pieces..." -ForegroundColor Yellow

# Convert white pieces (SVGs are black, so we invert to white)
Write-Host "`nCreating white pieces:" -ForegroundColor White
foreach ($piece in $pieces) {
    $svgFile = "chess-$piece.svg"
    $pngFile = "themes/classic/white/$($piece.Substring(0,1).ToUpper() + $piece.Substring(1)).png"
    
    if (!(Test-Path $svgFile)) {
        Write-Host "  Warning: $svgFile not found" -ForegroundColor Red
        continue
    }
    
    Write-Host "  Converting $piece..." -NoNewline
    
    # Convert SVG to PNG with color change:
    # - SVGs are black, so we colorize to white
    # - Keep transparent background
    # - Resize to fit within 80x80 (maintains aspect ratio)
    # - Place on 100x100 canvas centered
    $result = & magick convert `
        -background transparent `
        -density 300 `
        $svgFile `
        -resize 80x80 `
        -gravity center `
        -extent 100x100 `
        -fill white -colorize 100% `
        $pngFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host " Done" -ForegroundColor Green
    } else {
        Write-Host " Failed" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
    }
}

# Convert black pieces (SVGs are already black, keep as-is)
Write-Host "`nCreating black pieces:" -ForegroundColor Gray
foreach ($piece in $pieces) {
    $svgFile = "chess-$piece.svg"
    $pngFile = "themes/classic/black/$($piece.Substring(0,1).ToUpper() + $piece.Substring(1)).png"
    
    if (!(Test-Path $svgFile)) {
        Write-Host "  Warning: $svgFile not found" -ForegroundColor Red
        continue
    }
    
    Write-Host "  Converting $piece..." -NoNewline
    
    # Convert SVG to PNG:
    # - SVGs are already black, so no color change needed
    # - Same sizing as white pieces
    $result = & magick convert `
        -background transparent `
        -density 300 `
        $svgFile `
        -resize 80x80 `
        -gravity center `
        -extent 100x100 `
        $pngFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host " Done" -ForegroundColor Green
    } else {
        Write-Host " Failed" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
    }
}

Write-Host "`nConversion complete!" -ForegroundColor Green
Write-Host "Classic theme pieces have been generated in:" -ForegroundColor Cyan
Write-Host "  - themes/classic/white/" -ForegroundColor White
Write-Host "  - themes/classic/black/" -ForegroundColor Gray

# Verify files were created
Write-Host "`nVerifying generated files:" -ForegroundColor Yellow
$whiteCount = (Get-ChildItem "themes/classic/white/*.png" -ErrorAction SilentlyContinue).Count
$blackCount = (Get-ChildItem "themes/classic/black/*.png" -ErrorAction SilentlyContinue).Count

Write-Host "  White pieces: $whiteCount/6" -ForegroundColor $(if ($whiteCount -eq 6) { "Green" } else { "Red" })
Write-Host "  Black pieces: $blackCount/6" -ForegroundColor $(if ($blackCount -eq 6) { "Green" } else { "Red" })

if ($whiteCount -eq 6 -and $blackCount -eq 6) {
    Write-Host "`nAll pieces successfully converted!" -ForegroundColor Green
} else {
    Write-Host "`nWarning: Some pieces may have failed to convert" -ForegroundColor Yellow
}