<# :
@echo off
rem ===================================================================
rem  Audio + offline app: one window for the audio of
rem    - the English expression pages (eng\expressions)
rem    - the French expression pages (fr\expression)
rem    - the story and vocabulary pages (stories)
rem  ElevenLabs takes, leveling, Whisper check, R2 upload, online check
rem  and the offline single-file copy.
rem  Double-click to open. Close this console window to stop the app.
rem  Everything below is PowerShell; this file runs itself through it.
rem ===================================================================
set "AUDIO_APP_BAT=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -STA -Command "iex ([IO.File]::ReadAllText($env:AUDIO_APP_BAT, [Text.Encoding]::UTF8))"
if errorlevel 1 pause
exit /b
#>

# ---------------------------------------------------------------------------
#  What each button runs (from the LANGUAGES folder):
#
#  Generate next N clip(s) / Generate all missing run the page's make script below with
#  --only N N ...: only those clips are made, so you can go one clip at a time and watch the
#  ElevenLabs balance (shown at the top, checked again after every Generate run).
#
#  English expressions (eng\expressions\<topic>.html)
#    Make missing clips   python -E eng\expressions\make_audio.py <topic>
#                         (ElevenLabs V4, British RP woman, -12 LUFS, new takes Whisper-checked)
#    New takes            python -E eng\expressions\make_audio.py <topic> --redo N N
#    Whisper check all    whisper (English) on every clip, compared with the card text here
#    Upload to R2         python -E eng\expressions\make_audio.py <topic> --upload
#                         (uploads, sets a new ?v= tag, checks every clip through the CDN)
#    Offline copy         python -I eng\expressions\build_single.py <topic>
#                         -> eng\expressions\single\<topic>.html
#
#  French expressions (fr\expression\<topic>.html)
#    Make missing clips   python -E fr\expression\make_audio.py <topic>
#                         (ElevenLabs v3, Fr-Adrien, -16 LUFS; each clip Whisper-checked,
#                          up to 5 takes, the closest is kept)
#    New takes            make_audio.py has no --redo and never touches existing files, so the
#                         app first MOVES NN.mp3 and the raw takes (NN.mp3, NN_tK.mp3) into
#                         media\elevenlabs-raw\<folder>\_replaced_YYMMDD-HHMMSS\, then runs it.
#                         Nothing is deleted.
#    Whisper check all    whisper (French) on every clip, accents and punctuation ignored
#    Upload to R2         python -E fr\expression\upload_audio.py <folder>
#                         then, only if something was uploaded, AUD_EXT gets a new ?v= tag
#    Offline copy         python -I fr\expression\build_single.py <topic>
#                         -> fr\expression\single\<topic>.html
#
#  Stories and vocabulary (stories\<page>.html)
#    Make missing clips   python -E stories\story_audio.py <page>
#    New takes            python -E stories\story_audio.py <page> --redo N N
#    Re-level from raw    python -E stories\story_audio.py <page> --renormalize
#    Whisper check all    python -E stories\check_audio.py <page>
#    Upload to R2         python -E stories\story_audio.py <page> --upload
#                         (then a placeholder tag "mp3?v=pending" becomes mp3?v=YYMMDDHHMM)
#    Offline copy         python -I eng\build_single.py <page>  -> eng\single\<page>.html
#
#  French audio is never degraded: it is used for shadowing. The French offline copy
#  uses build_single.py, which embeds the clips as recorded (never build_single_small.py,
#  which shrinks them to 96 kbps mono). The stories builder keeps the original audio of
#  French pages too. This app never re-encodes or re-levels French clips.
#
#  Check online fetches the head of every clip URL. Only use it AFTER the upload:
#  a request for a clip that isn't there yet makes Cloudflare cache the 404 for 4 hours.
# ---------------------------------------------------------------------------

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path (Split-Path (Split-Path $env:AUDIO_APP_BAT))   # ...\LANGUAGES
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
$Ellipsis = [string][char]0x2026

$AudDirRe = 'const AUD_DIR =\s*"([^"]+)"'
$AudExtRe = 'const AUD_EXT =\s*"([^"]+)"'
$CardRe = '(?m)^\s*\[\s*"([^"]*)"\s*,'
$ChunkRe = '\[\s*(?:"((?:[^"\\]|\\.)*)"|''((?:[^''\\]|\\.)*)'')\s*,\s*(\d+)\s*\]'
$KindNames = @("English expressions", "French expressions", "Stories and vocabulary")
$KindIds = @("expr", "fr", "story")

# ------------------------------------------------------------------ helpers
function Get-EnvVar($name) {
    $v = [Environment]::GetEnvironmentVariable($name, "Process")
    if (-not $v) { $v = [Environment]::GetEnvironmentVariable($name, "User") }
    if ($v) { return $v.Trim() }
    return $null
}

function Get-SpokenEn($text) {
    # as eng\expressions\make_audio.py: no markup, a blank is said as a trailing "..."
    $t = [regex]::Replace($text, '<[^>]+>', '')
    return $t.Replace('___.', '...').Replace('___', '...')
}

function Get-SpokenFr($text) {
    # as fr\expression\make_audio.py: no brackets (desole(e) -> desole), no leading/trailing ellipsis
    $t = [regex]::Replace($text, '\s*\([^)]*\)', '')
    $t = [regex]::Replace($t, '^' + $Ellipsis + '\s*,?\s*', '')
    $t = [regex]::Replace($t, '\s*,\s*' + $Ellipsis + '\s*$', $Ellipsis)
    return (($t -split '\s+') -join ' ').Trim()
}

function Get-Letters($s, $lang) {
    $s = $s.ToLower()
    if ($lang -eq "fr") {
        $d = $s.Normalize([Text.NormalizationForm]::FormD)
        $sb = New-Object System.Text.StringBuilder
        foreach ($ch in $d.ToCharArray()) {
            if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch) -ne [Globalization.UnicodeCategory]::NonSpacingMark) { [void]$sb.Append($ch) }
        }
        $s = $sb.ToString()
    } else {
        $s = [regex]::Replace($s, '\bok\b', 'okay')   # Whisper writes OK as okay
    }
    return [regex]::Replace($s, '[^a-z]', '')
}

function Read-Text($path) { return [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8) }

function Get-Pages($kind) {
    $list = @()
    if ($kind -eq "expr" -or $kind -eq "fr") {
        if ($kind -eq "expr") { $dir = Join-Path $Root "eng\expressions"; $mediaBase = "media\eng\expressions" }
        else { $dir = Join-Path $Root "fr\expression"; $mediaBase = "media\lessons\expressions" }
        foreach ($f in Get-ChildItem -LiteralPath $dir -Filter *.html) {
            if ($f.Name -like "*_quiz*") { continue }
            $src = Read-Text $f.FullName
            $m = [regex]::Match($src, $AudDirRe)
            if (-not $m.Success) { continue }
            $b = [regex]::Match($src, 'const\s+categories\s*=\s*\[(.*?)\n\s*\];', [Text.RegularExpressions.RegexOptions]::Singleline)
            if (-not $b.Success) { continue }
            $audDir = $m.Groups[1].Value
            $ext = [regex]::Match($src, $AudExtRe).Groups[1].Value
            if (-not $ext) { $ext = "mp3" }
            $folder = ($audDir.TrimEnd('/') -split '/')[-1]
            $texts = @{}
            $n = 0
            foreach ($c in [regex]::Matches($b.Groups[1].Value, $CardRe)) {
                $n++
                if ($kind -eq "fr") { $texts[$n] = Get-SpokenFr $c.Groups[1].Value } else { $texts[$n] = Get-SpokenEn $c.Groups[1].Value }
            }
            if ($n -eq 0) { continue }
            $list += New-Page $kind $f.BaseName $f.FullName $audDir $ext $folder "$mediaBase\$folder" $texts $n
        }
    } else {
        foreach ($f in Get-ChildItem -LiteralPath (Join-Path $Root "stories") -Filter *.html) {
            $src = Read-Text $f.FullName
            if ($src -notmatch 'ytstory\.js') { continue }              # readers only, not quizzes
            $m = [regex]::Match($src, $AudDirRe)
            if (-not $m.Success) { continue }
            $audDir = $m.Groups[1].Value
            $ext = [regex]::Match($src, $AudExtRe).Groups[1].Value
            if (-not $ext) { $ext = "mp3" }
            $path = ([Uri]$audDir).AbsolutePath.Trim('/')                # eng/yt/<slug>
            $i = $src.IndexOf("const pages")
            if ($i -lt 0) { continue }
            $texts = @{}
            $n = 0
            foreach ($c in [regex]::Matches($src.Substring($i), $ChunkRe)) {
                $num = [int]$c.Groups[3].Value
                $t = if ($c.Groups[1].Success) { $c.Groups[1].Value } else { $c.Groups[2].Value }
                $texts[$num] = $t.Replace("\'", "'").Replace('\"', '"')
                if ($num -gt $n) { $n = $num }
            }
            if ($n -eq 0) { continue }
            $folder = ($path -split '/')[-1]
            $list += New-Page "story" $f.BaseName $f.FullName $audDir $ext $folder ("media\" + $path.Replace('/', '\')) $texts $n
        }
    }
    return $list | Sort-Object Name
}

function New-Page($kind, $name, $file, $audDir, $ext, $folder, $media, $texts, $n) {
    $mediaFull = Join-Path $Root $media
    $missing = @()
    $chars = 0
    for ($k = 1; $k -le $n; $k++) {
        if (-not (Test-Path -LiteralPath (Join-Path $mediaFull ("{0:D2}.mp3" -f $k)))) {
            $missing += $k
            if ($texts.ContainsKey($k)) { $chars += $texts[$k].Length }
        }
    }
    $tag = ""
    $tm = [regex]::Match($ext, '\?v=(.*)$')
    if ($tm.Success) { $tag = $tm.Groups[1].Value }
    switch ($kind) {
        "expr" { $single = Join-Path $Root "eng\expressions\single\$name.html" }
        "fr" { $single = Join-Path $Root "fr\expression\single\$name.html" }
        default { $single = Join-Path $Root "eng\single\$name.html" }
    }
    return [pscustomobject]@{
        Kind = $kind; Name = $name; File = $file; AudDir = $audDir; Ext = $ext; Tag = $tag; Folder = $folder
        Media = $mediaFull; Texts = $texts; Total = $n; Missing = $missing; Chars = $chars
        Single = $single
    }
}

function Parse-Numbers($text) {
    $nums = @()
    foreach ($p in ($text -split '[\s,;]+')) {
        if ($p -match '^\d+$') { $nums += [int]$p }
    }
    return $nums
}

# ------------------------------------------------------------------ window
$form = New-Object System.Windows.Forms.Form
$form.Text = "Audio + offline copies - English expressions, French expressions, stories"
$form.Size = New-Object System.Drawing.Size(1280, 860)
$form.MinimumSize = New-Object System.Drawing.Size(1240, 700)
$form.StartPosition = "CenterScreen"
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$form.AutoScaleMode = "Dpi"

# top bar
$top = New-Object System.Windows.Forms.Panel
$top.Dock = "Top"; $top.Height = 44
$lblKind = New-Object System.Windows.Forms.Label
$lblKind.Text = "Pages:"; $lblKind.AutoSize = $true; $lblKind.Location = New-Object System.Drawing.Point(10, 13)
$cmbKind = New-Object System.Windows.Forms.ComboBox
$cmbKind.DropDownStyle = "DropDownList"; $cmbKind.Width = 230; $cmbKind.Location = New-Object System.Drawing.Point(62, 9)
foreach ($k in $KindNames) { [void]$cmbKind.Items.Add($k) }
$btnRefresh = New-Object System.Windows.Forms.Button
$btnRefresh.Text = "Refresh"; $btnRefresh.Width = 90; $btnRefresh.Location = New-Object System.Drawing.Point(305, 8)
$chkMissing = New-Object System.Windows.Forms.CheckBox
$chkMissing.Text = "Only pages with missing clips"; $chkMissing.AutoSize = $true; $chkMissing.Location = New-Object System.Drawing.Point(410, 12)
$top.Controls.AddRange(@($lblKind, $cmbKind, $btnRefresh, $chkMissing))

# ElevenLabs balance, always visible
$credit = New-Object System.Windows.Forms.Panel
$credit.Dock = "Top"; $credit.Height = 42
$credit.BackColor = [System.Drawing.Color]::FromArgb(232, 241, 255)
$btnCredits = New-Object System.Windows.Forms.Button
$btnCredits.Text = "Check balance"; $btnCredits.Width = 130; $btnCredits.Height = 30
$btnCredits.Location = New-Object System.Drawing.Point(8, 6)
$lblCredits = New-Object System.Windows.Forms.Label
$lblCredits.AutoSize = $true; $lblCredits.Location = New-Object System.Drawing.Point(150, 11)
$lblCredits.Font = New-Object System.Drawing.Font("Segoe UI", 10.5, [System.Drawing.FontStyle]::Bold)
$lblCredits.Text = "ElevenLabs balance: not checked yet"
$credit.Controls.AddRange(@($btnCredits, $lblCredits))

# page list
$list = New-Object System.Windows.Forms.ListView
$list.Dock = "Top"; $list.Height = 300
$list.View = "Details"; $list.FullRowSelect = $true; $list.MultiSelect = $false; $list.HideSelection = $false
[void]$list.Columns.Add("Page", 240)
[void]$list.Columns.Add("Clips", 90)
[void]$list.Columns.Add("Missing", 70)
[void]$list.Columns.Add("Characters to make", 140)
[void]$list.Columns.Add("Cache tag", 120)
[void]$list.Columns.Add("Offline copy", 160)
[void]$list.Columns.Add("Clips folder", 320)

# button rows (fixed height; the window can't get narrower than they need)
function New-Row($title) {
    $r = New-Object System.Windows.Forms.FlowLayoutPanel
    $r.Dock = "Top"; $r.WrapContents = $false
    $r.AutoSize = $true; $r.AutoSizeMode = "GrowAndShrink"          # as tall as its tallest button
    $r.Padding = New-Object System.Windows.Forms.Padding(6, 4, 6, 0)
    $l = New-Object System.Windows.Forms.Label
    $l.Text = $title; $l.Width = 130; $l.Margin = New-Object System.Windows.Forms.Padding(4, 12, 4, 0)
    $l.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
    $r.Controls.Add($l)
    return $r
}
function New-Button($row, $text, $width) {
    $b = New-Object System.Windows.Forms.Button
    $b.Text = $text
    $b.AutoSize = $true; $b.MinimumSize = New-Object System.Drawing.Size($width, 32)   # grows with the text at any scaling
    $b.Margin = New-Object System.Windows.Forms.Padding(4)
    $row.Controls.Add($b)
    return $b
}
function New-Label($row, $text, $topMargin) {
    $l = New-Object System.Windows.Forms.Label
    $l.Text = $text; $l.AutoSize = $true; $l.Margin = New-Object System.Windows.Forms.Padding(4, $topMargin, 4, 0)
    $row.Controls.Add($l)
    return $l
}

$rowGen = New-Row "1  Generate"
$btnNext = New-Button $rowGen "Generate next" 120
$numNext = New-Object System.Windows.Forms.NumericUpDown
$numNext.Minimum = 1; $numNext.Maximum = 99; $numNext.Value = 1; $numNext.Width = 50
$numNext.Margin = New-Object System.Windows.Forms.Padding(2, 9, 2, 4)
$rowGen.Controls.Add($numNext)
[void](New-Label $rowGen "clip(s)" 12)
$btnAll = New-Button $rowGen "Generate all missing" 160
[void](New-Label $rowGen "    New takes of:" 12)
$txtRedo = New-Object System.Windows.Forms.TextBox
$txtRedo.Width = 100; $txtRedo.Margin = New-Object System.Windows.Forms.Padding(4, 9, 4, 4)
$rowGen.Controls.Add($txtRedo)
$btnRedo = New-Button $rowGen "Make new takes" 130
$btnRelevel = New-Button $rowGen "Re-level from raw" 140

$rowPub = New-Row "2  Check, publish"
$btnCheck = New-Button $rowPub "Whisper check all" 150
$btnUpload = New-Button $rowPub "Upload to R2" 120
$btnOnline = New-Button $rowPub "Check online" 120
$btnOffline = New-Button $rowPub "Offline copy" 120
$btnOpenOffline = New-Button $rowPub "Open offline file" 140
$btnFolder = New-Button $rowPub "Open clips folder" 140

$rowInfo = New-Row "Next clip"
$btnStop = New-Button $rowInfo "Stop" 80
$btnClear = New-Button $rowInfo "Clear log" 90
$lblNext = New-Label $rowInfo "Choose a page." 12
$lblNext.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Italic)

# log + status
$log = New-Object System.Windows.Forms.TextBox
$log.Dock = "Fill"; $log.Multiline = $true; $log.ReadOnly = $true; $log.ScrollBars = "Both"; $log.WordWrap = $false
$log.Font = New-Object System.Drawing.Font("Consolas", 9.5)
$log.BackColor = [System.Drawing.Color]::FromArgb(250, 250, 250)
$status = New-Object System.Windows.Forms.StatusStrip
$statusLabel = New-Object System.Windows.Forms.ToolStripStatusLabel
$statusLabel.Text = "Ready"
[void]$status.Items.Add($statusLabel)

# docking order: Fill first, then Top controls from the lowest to the highest
$form.Controls.Add($log)
$form.Controls.Add($rowInfo)
$form.Controls.Add($rowPub)
$form.Controls.Add($rowGen)
$form.Controls.Add($list)
$form.Controls.Add($credit)
$form.Controls.Add($top)
$form.Controls.Add($status)

function Write-Log($text) {
    $log.AppendText(($text -replace "`r?`n", "`r`n"))
}
function Write-Line($text) { Write-Log ($text + "`r`n") }

# ------------------------------------------------------------------ page list
$script:pages = @()
function Get-Kind {
    $i = $cmbKind.SelectedIndex
    if ($i -lt 0) { $i = 0 }
    return $KindIds[$i]
}

function Fill-List {
    $keep = $null
    if ($list.SelectedItems.Count) { $keep = $list.SelectedItems[0].Text }
    $list.BeginUpdate()
    $list.Items.Clear()
    $script:pages = @(Get-Pages (Get-Kind))
    foreach ($p in $script:pages) {
        if ($chkMissing.Checked -and $p.Missing.Count -eq 0) { continue }
        $have = $p.Total - $p.Missing.Count
        $it = New-Object System.Windows.Forms.ListViewItem($p.Name)
        [void]$it.SubItems.Add("$have / $($p.Total)")
        [void]$it.SubItems.Add([string]$p.Missing.Count)
        [void]$it.SubItems.Add($(if ($p.Chars) { "{0:N0}" -f $p.Chars } else { "" }))
        [void]$it.SubItems.Add($p.Tag)
        if (Test-Path -LiteralPath $p.Single) {
            $fi = Get-Item -LiteralPath $p.Single
            [void]$it.SubItems.Add(("{0:N1} MB, {1:yyyy-MM-dd}" -f ($fi.Length / 1MB), $fi.LastWriteTime))
        } else { [void]$it.SubItems.Add("") }
        [void]$it.SubItems.Add($p.Media.Substring($Root.Length + 1))
        if ($have -eq 0) { $it.BackColor = [System.Drawing.Color]::FromArgb(253, 226, 226) }
        elseif ($p.Missing.Count) { $it.BackColor = [System.Drawing.Color]::FromArgb(255, 241, 214) }
        else { $it.BackColor = [System.Drawing.Color]::FromArgb(224, 245, 228) }
        $it.Tag = $p
        [void]$list.Items.Add($it)
        if ($keep -and $p.Name -eq $keep) { $it.Selected = $true; $it.EnsureVisible() }
    }
    $list.EndUpdate()
    $none = @($script:pages | Where-Object { $_.Missing.Count -eq $_.Total }).Count
    $part = @($script:pages | Where-Object { $_.Missing.Count -and $_.Missing.Count -lt $_.Total }).Count
    $statusLabel.Text = "$($script:pages.Count) pages: $none without audio, $part partly done.  Red = no clips, amber = some missing, green = complete."
    Update-Buttons
    Update-NextInfo
}

function Update-NextInfo {
    if (-not $list.SelectedItems.Count) { $lblNext.Text = "Choose a page in the list."; return }
    $p = $list.SelectedItems[0].Tag
    if (-not $p.Missing.Count) { $lblNext.Text = "$($p.Name): all $($p.Total) clips are made."; return }
    $n = $p.Missing[0]
    $t = $p.Texts[$n]
    $extra = ""
    if ($p.Kind -eq "fr") { $extra = " (more if Whisper asks for extra takes)" }
    $lblNext.Text = ('{0}: clip {1:D2}  "{2}"  = {3} characters{4}.   {5} clip(s) missing in all.' -f $p.Name, $n, $t, $t.Length, $extra, $p.Missing.Count)
}

function Get-Selected {
    if (-not $list.SelectedItems.Count) {
        [void][System.Windows.Forms.MessageBox]::Show("Choose a page in the list first.", "Audio app")
        return $null
    }
    return $list.SelectedItems[0].Tag
}

# ------------------------------------------------------------------ running a job
$script:proc = $null
$script:logFile = $null
$script:logPos = 0
$script:decoder = $null
$script:onDone = $null
$script:jobName = ""
$script:jobText = ""
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 300

function Update-Buttons {
    $busy = $null -ne $script:proc
    foreach ($b in @($btnNext, $numNext, $btnAll, $btnRedo, $btnCheck, $btnUpload, $btnOnline, $btnOffline, $btnRefresh, $cmbKind, $btnCredits)) { $b.Enabled = -not $busy }
    $btnRelevel.Enabled = (-not $busy) -and ((Get-Kind) -eq "story")   # never for French: no re-leveling
    $btnStop.Enabled = $busy
}

function Start-Run($name, $cmdline, [scriptblock]$onDone, [switch]$dropStderr) {
    $script:logFile = [IO.Path]::GetTempFileName()
    $script:logPos = 0
    $script:decoder = [Text.Encoding]::UTF8.GetDecoder()
    $script:onDone = $onDone
    $script:jobName = $name
    $script:jobText = ""
    $err = if ($dropStderr) { "2>nul" } else { "2>&1" }
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"
    $psi.Arguments = '/d /s /c "' + $cmdline + ' > "' + $script:logFile + '" ' + $err + '"'
    $psi.WorkingDirectory = $Root
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.EnvironmentVariables["PYTHONUNBUFFERED"] = "1"
    $psi.EnvironmentVariables["PYTHONIOENCODING"] = "utf-8"
    Write-Line ""
    Write-Line ("=== {0}  {1}" -f (Get-Date -Format "HH:mm:ss"), $name)
    Write-Line ("> " + $cmdline)
    $script:proc = [System.Diagnostics.Process]::Start($psi)
    $statusLabel.Text = "Running: $name"
    Update-Buttons
    $timer.Start()
}

function Read-NewLog {
    if (-not $script:logFile -or -not (Test-Path -LiteralPath $script:logFile)) { return }
    $fs = [IO.File]::Open($script:logFile, "Open", "Read", "ReadWrite")
    try {
        [void]$fs.Seek($script:logPos, "Begin")
        $buf = New-Object byte[] 65536
        while (($n = $fs.Read($buf, 0, $buf.Length)) -gt 0) {
            $script:logPos += $n
            $chars = New-Object char[] ($n + 4)
            $c = $script:decoder.GetChars($buf, 0, $n, $chars, 0)
            if ($c) {
                $text = ([string]::new($chars, 0, $c)) -replace "`r(?!`n)", "`n"   # progress bars
                $script:jobText += $text
                Write-Log $text
            }
        }
    } finally { $fs.Close() }
}

$timer.Add_Tick({
    Read-NewLog
    if ($script:proc -and $script:proc.HasExited) {
        $timer.Stop()
        Start-Sleep -Milliseconds 150
        Read-NewLog
        $code = $script:proc.ExitCode
        $name = $script:jobName
        $done = $script:onDone
        $script:proc = $null
        Remove-Item -LiteralPath $script:logFile -ErrorAction SilentlyContinue
        if ($code -eq 0) { Write-Line "=== done: $name" } else { Write-Line "=== FAILED (exit code $code): $name" }
        $statusLabel.Text = $(if ($code -eq 0) { "Done: $name" } else { "Failed: $name (exit code $code)" })
        if ($done) { & $done $code }
        Fill-List
    }
})

$btnStop.Add_Click({
    if ($script:proc) {
        Write-Line "=== stopping..."
        & taskkill.exe /PID $script:proc.Id /T /F | Out-Null
    }
})

function Ask-YesNo($text) {
    $r = [System.Windows.Forms.MessageBox]::Show($text, "Audio app",
        [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
    return $r -eq [System.Windows.Forms.DialogResult]::Yes
}

function Script-For($p) {
    switch ($p.Kind) {
        "expr" { return "python -E eng\expressions\make_audio.py $($p.Name)" }
        "fr" { return "python -E fr\expression\make_audio.py $($p.Name)" }
        default { return "python -E stories\story_audio.py $($p.Name)" }
    }
}

function Set-NewTag($p) {
    # writes AUD_EXT = "mp3?v=YYMMDDHHMM" into the page (only after an upload)
    $src = Read-Text $p.File
    $tag = Get-Date -Format "yyMMddHHmm"
    $new = [regex]::Replace($src, 'const AUD_EXT =(\s*)"mp3(\?v=[^"]*)?"', ('const AUD_EXT =$1"mp3?v=' + $tag + '"'))
    if ($new -ne $src) {
        [IO.File]::WriteAllText($p.File, $new, $Utf8NoBom)
        Write-Line "AUD_EXT tag set to $tag in $([IO.Path]::GetFileName($p.File))"
    } else {
        Write-Line "AUD_EXT not found in $([IO.Path]::GetFileName($p.File)); set the ?v= tag by hand."
    }
}

# ------------------------------------------------------------------ buttons
function Update-Credits {
    # reads the ElevenLabs balance; returns the characters left, or $null
    $key = Get-EnvVar "ELEVENLABS_API_KEY"
    if (-not $key) { $lblCredits.Text = "ElevenLabs balance: ELEVENLABS_API_KEY is not set"; return $null }
    try {
        $sub = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/user/subscription" -Headers @{ "xi-api-key" = $key } -TimeoutSec 20
        $left = [int64]$sub.character_limit - [int64]$sub.character_count
        $reset = ""
        if ($sub.next_character_count_reset_unix) {
            $reset = "   (resets " + ([DateTimeOffset]::FromUnixTimeSeconds([int64]$sub.next_character_count_reset_unix).LocalDateTime.ToString("yyyy-MM-dd")) + ")"
        }
        $lblCredits.Text = ("ElevenLabs balance: {0:N0} characters left of {1:N0}{2}   - checked {3:HH:mm}" -f $left, [int64]$sub.character_limit, $reset, (Get-Date))
        $script:creditsLeft = $left
        return $left
    } catch {
        $lblCredits.Text = "ElevenLabs balance: could not read it (" + $_.Exception.Message + ")"
        return $null
    }
}
$script:creditsLeft = $null

function Start-Generate($p, $nums) {
    $script:genBefore = Update-Credits
    $script:genPage = $p
    $cmd = (Script-For $p) + " --only " + ($nums -join " ")
    Start-Run ("generate {0}: {1}" -f ($nums -join " "), $p.Name) $cmd {
        param($code)
        $before = $script:genBefore
        $left = Update-Credits
        if ($null -ne $before -and $null -ne $left) {
            Write-Line ("ElevenLabs: {0:N0} characters used by this run, {1:N0} left." -f ($before - $left), $left)
        }
    }
}

function Cost-Of($p, $nums) {
    $c = 0
    foreach ($n in $nums) { if ($p.Texts.ContainsKey($n)) { $c += $p.Texts[$n].Length } }
    return $c
}

$btnNext.Add_Click({
    $p = Get-Selected; if (-not $p) { return }
    if (-not $p.Missing.Count) {
        [void][System.Windows.Forms.MessageBox]::Show("$($p.Name) has all $($p.Total) clips. Use New takes to re-record single clips.", "Audio app")
        return
    }
    $nums = @($p.Missing | Select-Object -First ([int]$numNext.Value))
    $chars = Cost-Of $p $nums
    if ($nums.Count -gt 1 -or ($null -ne $script:creditsLeft -and $chars -gt $script:creditsLeft)) {
        $msg = "Generate clip(s) $($nums -join ', ') of $($p.Name) with ElevenLabs?`n`nAbout $chars characters"
        if ($p.Kind -eq "fr") { $msg += " (more if Whisper asks for extra takes)" }
        if ($null -ne $script:creditsLeft) { $msg += "; $("{0:N0}" -f $script:creditsLeft) left." } else { $msg += "." }
        if ($null -ne $script:creditsLeft -and $chars -gt $script:creditsLeft) { $msg += "`n`nWARNING: that is more than the balance." }
        if (-not (Ask-YesNo $msg)) { return }
    }
    Start-Generate $p $nums
})

$btnAll.Add_Click({
    $p = Get-Selected; if (-not $p) { return }
    if (-not $p.Missing.Count) {
        [void][System.Windows.Forms.MessageBox]::Show("$($p.Name) has all $($p.Total) clips. Use New takes to re-record single clips.", "Audio app")
        return
    }
    $cost = "About $("{0:N0}" -f $p.Chars) characters of credit"
    if ($p.Kind -eq "fr") { $cost += ", up to $("{0:N0}" -f ($p.Chars * 5)) if Whisper asks for extra takes" }
    if ($null -ne $script:creditsLeft) { $cost += "; $("{0:N0}" -f $script:creditsLeft) left" }
    $msg = "Generate all $($p.Missing.Count) missing clip(s) of $($p.Name) with ElevenLabs?`n`n$cost.`nThe new clips are leveled and checked with Whisper."
    if ($null -ne $script:creditsLeft -and $p.Chars -gt $script:creditsLeft) { $msg += "`n`nWARNING: that is more than the balance." }
    if (-not (Ask-YesNo $msg)) { return }
    Start-Generate $p @($p.Missing)
})

$btnRedo.Add_Click({
    $p = Get-Selected; if (-not $p) { return }
    $nums = @(Parse-Numbers $txtRedo.Text | Where-Object { $_ -ge 1 -and $_ -le $p.Total })
    if (-not $nums.Count) {
        [void][System.Windows.Forms.MessageBox]::Show("Type the clip numbers to re-record, e.g. 6 12 30 (1 to $($p.Total)).", "Audio app")
        return
    }
    $chars = 0
    foreach ($n in $nums) { if ($p.Texts.ContainsKey($n)) { $chars += $p.Texts[$n].Length } }
    if ($p.Kind -ne "fr") {
        if (-not (Ask-YesNo "Make new takes of clip(s) $($nums -join ', ') for $($p.Name)?`n`nAbout $chars characters of credit. The old clips are replaced.")) { return }
        Start-Run "new takes $($nums -join ' '): $($p.Name)" ((Script-For $p) + " --redo " + ($nums -join " ")) $null
        return
    }
    # French: move the old clip and its raw takes aside, then make_audio.py makes it again
    $raw = Join-Path $Root ("media\elevenlabs-raw\" + $p.Folder)
    $msg = "Make new takes of clip(s) $($nums -join ', ') for $($p.Name)?`n`nThe current clips and their raw takes are MOVED (not deleted) to`n$raw\_replaced_<date>`nthen make_audio.py records them again (Whisper-checked, up to 5 takes).`n`nAbout $chars to $($chars * 5) characters of credit."
    if (-not (Ask-YesNo $msg)) { return }
    $dest = Join-Path $raw ("_replaced_" + (Get-Date -Format "yyMMdd-HHmmss"))
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
    $moved = 0
    foreach ($n in $nums) {
        $nn = "{0:D2}" -f $n
        $clip = Join-Path $p.Media "$nn.mp3"
        if (Test-Path -LiteralPath $clip) { Move-Item -LiteralPath $clip -Destination (Join-Path $dest "$nn.mp3") ; $moved++ }
        if (Test-Path -LiteralPath $raw) {
            foreach ($f in Get-ChildItem -LiteralPath $raw -File | Where-Object { $_.Name -eq "$nn.mp3" -or $_.Name -like "${nn}_t*.mp3" }) {
                Move-Item -LiteralPath $f.FullName -Destination (Join-Path $dest ("raw_" + $f.Name)); $moved++
            }
        }
    }
    Write-Line ""
    Write-Line "Moved $moved file(s) to $dest"
    Start-Run "new takes $($nums -join ' '): $($p.Name)" (Script-For $p) $null
})

$btnRelevel.Add_Click({
    $p = Get-Selected; if (-not $p) { return }
    if ($p.Kind -ne "story") { return }
    if (-not (Ask-YesNo "Re-level every clip of $($p.Name) from the raw takes?`n`nNo ElevenLabs credits are used.")) { return }
    Start-Run "re-level: $($p.Name)" ((Script-For $p) + " --renormalize") $null
})

$btnCheck.Add_Click({
    $p = Get-Selected; if (-not $p) { return }
    $have = @()
    for ($k = 1; $k -le $p.Total; $k++) { if ($p.Missing -notcontains $k) { $have += $k } }
    if (-not $have.Count) {
        [void][System.Windows.Forms.MessageBox]::Show("$($p.Name) has no clips yet.", "Audio app")
        return
    }
    if ($p.Kind -eq "story") {
        Start-Run "Whisper check: $($p.Name)" "python -E stories\check_audio.py $($p.Name)" $null
        return
    }
    # expression pages: whisper on every clip, then compare with the card text here
    $lang = if ($p.Kind -eq "fr") { "fr" } else { "en" }
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ("audio_app_" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $tmp | Out-Null
    $files = ($have | ForEach-Object { '"' + (Join-Path $p.Media ("{0:D2}.mp3" -f $_)) + '"' }) -join " "
    $script:checkPage = $p
    $script:checkNums = $have
    $script:checkTmp = $tmp
    $script:checkLang = $lang
    Write-Line ""
    Write-Line "Whisper (small model, $lang) is transcribing $($have.Count) clips; this can take a few minutes."
    $cmd = "whisper $files --model small --language $lang --output_format txt --output_dir `"$tmp`" --verbose False --fp16 False"
    Start-Run "Whisper check: $($p.Name)" $cmd {
        param($code)
        $p = $script:checkPage
        $bad = 0
        foreach ($n in $script:checkNums) {
            $txt = Join-Path $script:checkTmp ("{0:D2}.txt" -f $n)
            $heard = if (Test-Path -LiteralPath $txt) { (Read-Text $txt).Trim() } else { "(no transcript)" }
            $want = $p.Texts[$n]
            $flag = ""
            if ((Get-Letters $heard $script:checkLang) -ne (Get-Letters $want $script:checkLang)) { $flag = "   <<< check"; $bad++ }
            Write-Line ("{0:D2}.mp3  {1}  | heard: {2}{3}" -f $n, $want, $heard, $flag)
        }
        Write-Line ("Whisper check: {0} of {1} clips to listen to (often only spelling or very short clips; re-take only if the words are wrong)." -f $bad, $script:checkNums.Count)
        Remove-Item -LiteralPath $script:checkTmp -Recurse -Force -ErrorAction SilentlyContinue
    } -dropStderr
})

$btnUpload.Add_Click({
    $p = Get-Selected; if (-not $p) { return }
    if ($p.Missing.Count) {
        [void][System.Windows.Forms.MessageBox]::Show("$($p.Name) still has $($p.Missing.Count) missing clip(s). Make them first.", "Audio app")
        return
    }
    if (-not (Ask-YesNo "Upload the clips of $($p.Name) to R2 (bucket languages)?`n`nOnly new or changed clips are sent.")) { return }
    $script:uploadPage = $p
    switch ($p.Kind) {
        "expr" {
            Start-Run "upload: $($p.Name)" ((Script-For $p) + " --upload") $null
        }
        "fr" {
            Start-Run "upload: $($p.Name)" "python -E fr\expression\upload_audio.py $($p.Folder)" {
                param($code)
                if ($code -ne 0) { return }
                $p = $script:uploadPage
                $m = [regex]::Match($script:jobText, 'uploaded\s+(\d+)\s+online match\s+(\d+)/(\d+)')
                if (-not $m.Success) { Write-Line "Couldn't read the upload summary; the ?v= tag was not changed."; return }
                if ($m.Groups[2].Value -ne $m.Groups[3].Value) { Write-Line "Not every clip matches online; the ?v= tag was not changed."; return }
                if ([int]$m.Groups[1].Value -gt 0) { Set-NewTag $p; Write-Line "Next: Check online." }
                else { Write-Line "Nothing new was uploaded; the ?v= tag stays." }
            }
        }
        default {
            Start-Run "upload: $($p.Name)" ((Script-For $p) + " --upload") {
                param($code)
                if ($code -ne 0) { return }
                $p = $script:uploadPage
                if ((Read-Text $p.File) -match 'const AUD_EXT =\s*"mp3\?v=pending"') { Set-NewTag $p }
                Write-Line "Next: Check online, to see that every clip is served."
            }
        }
    }
})

$btnOnline.Add_Click({
    $p = Get-Selected; if (-not $p) { return }
    $msg = "Check every clip of $($p.Name) online?`n`nOnly do this AFTER the upload. A request for a clip that isn't online yet makes Cloudflare cache the 'not found' for 4 hours, and the page then stays silent even after the upload."
    if (-not (Ask-YesNo $msg)) { return }
    $src = Read-Text $p.File                     # the tag may have just changed
    $ext = [regex]::Match($src, $AudExtRe).Groups[1].Value
    if (-not $ext) { $ext = "mp3" }
    Write-Line ""
    Write-Line ("=== {0}  online check: {1}" -f (Get-Date -Format "HH:mm:ss"), $p.Name)
    $bad = @()
    for ($k = 1; $k -le $p.Total; $k++) {
        $url = "{0}{1:D2}.{2}" -f $p.AudDir, $k, $ext
        try {
            $r = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 20
            $code = [int]$r.StatusCode
        } catch {
            $code = 0
            if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
        }
        if ($code -ne 200) { $bad += ("{0:D2} ({1})" -f $k, $code) }
        $statusLabel.Text = "Online check: $k / $($p.Total)"
        [System.Windows.Forms.Application]::DoEvents()
    }
    if ($bad.Count) { Write-Line ("NOT OK: " + ($bad -join ", ")) }
    Write-Line ("Online check: {0} of {1} clips answer 200." -f ($p.Total - $bad.Count), $p.Total)
    $statusLabel.Text = "Online check done: $($p.Name)"
})

$btnOffline.Add_Click({
    $p = Get-Selected; if (-not $p) { return }
    if ($p.Missing.Count) {
        if (-not (Ask-YesNo "$($p.Name) is missing $($p.Missing.Count) clip(s). The offline copy embeds the clips, so those cards would be silent.`n`nBuild it anyway?")) { return }
    }
    switch ($p.Kind) {
        "expr" { $cmd = "python -I eng\expressions\build_single.py $($p.Name)" }
        "fr" { $cmd = "python -I fr\expression\build_single.py $($p.Name)" }   # full quality, never build_single_small.py
        default { $cmd = "python -I eng\build_single.py $($p.Name)" }
    }
    $script:offlinePage = $p
    Start-Run "offline copy: $($p.Name)" $cmd {
        param($code)
        $p = $script:offlinePage
        if (Test-Path -LiteralPath $p.Single) {
            $fi = Get-Item -LiteralPath $p.Single
            Write-Line ("Offline copy: {0}  ({1:N1} MB, {2:HH:mm:ss})" -f $p.Single, ($fi.Length / 1MB), $fi.LastWriteTime)
        } elseif ($code -eq 0) {
            Write-Line "The builder finished, but $($p.Single) was not found."
        }
    }
})

$btnOpenOffline.Add_Click({
    $p = Get-Selected; if (-not $p) { return }
    if (Test-Path -LiteralPath $p.Single) { Start-Process -FilePath $p.Single }
    else { [void][System.Windows.Forms.MessageBox]::Show("No offline copy yet: $($p.Single)", "Audio app") }
})

$btnFolder.Add_Click({
    $p = Get-Selected; if (-not $p) { return }
    if (Test-Path -LiteralPath $p.Media) { Start-Process explorer.exe -ArgumentList "`"$($p.Media)`"" }
    else { [void][System.Windows.Forms.MessageBox]::Show("No clips folder yet: $($p.Media)", "Audio app") }
})

$btnClear.Add_Click({ $log.Clear() })

$btnCredits.Add_Click({ [void](Update-Credits) })

$btnRefresh.Add_Click({ Fill-List })
$chkMissing.Add_CheckedChanged({ Fill-List })
$cmbKind.Add_SelectedIndexChanged({ Fill-List })
$list.Add_DoubleClick({ $btnFolder.PerformClick() })
$list.Add_SelectedIndexChanged({ Update-NextInfo })

$form.Add_FormClosing({
    if ($script:proc) {
        if (-not (Ask-YesNo "A job is still running. Stop it and close?")) { $_.Cancel = $true; return }
        & taskkill.exe /PID $script:proc.Id /T /F | Out-Null
    }
})

# self-test (AUDIO_APP_SELFTEST=<file>): list the pages, write a summary, close. No audio, no network.
if ($env:AUDIO_APP_SELFTEST) {
    $form.Add_Shown({
        $out = @()
        foreach ($i in 0, 1, 2) {
            $cmbKind.SelectedIndex = $i
            $complete = @($script:pages | Where-Object { -not $_.Missing.Count }).Count
            $out += "{0}: {1} pages, {2} rows, {3} complete" -f $cmbKind.Text, $script:pages.Count, $list.Items.Count, $complete
            foreach ($p in ($script:pages | Where-Object { $_.Missing.Count })) {
                $out += "  {0}: {1}/{2} clips, {3} chars to make, tag '{4}', folder {5}" -f $p.Name, ($p.Total - $p.Missing.Count), $p.Total, $p.Chars, $p.Tag, $p.Folder
            }
            foreach ($name in "greet_goodbye", "offers", "wishes") {
                $q = $script:pages | Where-Object { $_.Name -eq $name }
                if ($q) { $out += "  [{0}] {1} cards, folder {2}, media {3}, offline {4}" -f $name, $q.Total, $q.Folder, $q.Media.Substring($Root.Length + 1), $q.Single.Substring($Root.Length + 1) }
            }
        }
        $cmbKind.SelectedIndex = 0
        foreach ($it in $list.Items) { if ($it.Text -eq "advice") { $it.Selected = $true } }
        $out += "next-clip line: " + $lblNext.Text
        $out += "rows: " + (($rowGen, $rowPub, $rowInfo | ForEach-Object { ($_.Controls | ForEach-Object { $_.Text }) -join " | " }) -join "  //  ")
        $hidden = @()
        foreach ($r in $rowGen, $rowPub, $rowInfo) { foreach ($c in $r.Controls) { if ($c.Right -gt $r.ClientSize.Width -or $c.Bottom -gt $r.ClientSize.Height) { $hidden += $c.Text } } }
        $out += "controls outside their row: " + $(if ($hidden.Count) { $hidden -join ", " } else { "none" })
        [IO.File]::WriteAllLines($env:AUDIO_APP_SELFTEST, $out, $Utf8NoBom)
        $form.Close()
    })
}

if (-not $env:AUDIO_APP_SELFTEST) { $form.Add_Shown({ [void](Update-Credits) }) }

$cmbKind.SelectedIndex = 0
Write-Line "Choose the kind of page and a page. Row 1 generates audio (one clip at a time if you like); row 2 checks, uploads and builds the offline copy."
Write-Line "ElevenLabs and R2 keys come from your User environment variables, as in the scripts. French audio is never re-encoded."
[void]$form.ShowDialog()
