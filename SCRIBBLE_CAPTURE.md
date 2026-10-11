# Scribble capture tools

A PowerShell entry point produces repeatable screenshots from the preview page
used to calibrate the 3D transition. It starts a temporary local HTTP server,
finds Edge or Chrome, captures into the ignored `screenshots/` directory,
verifies that every PNG is non-blank, and cleans up the server and temporary
browser profile.

## Capture the transition

From the repository root:

```powershell
.\tools\capture-scribble-transition.cmd
```

The default run captures fifteen authored milestones from the original 2D
follow and closed-door burst, through the matched overhead 3D frame, overhead
zoom, delayed wall reveal, camera turn, extended corridor route, and impact at 1280x800 in
`screenshots/scribble-transition/`.
Choose denser points or another viewport:

```powershell
.\tools\capture-scribble-transition.cmd `
  -Progress 0,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100 `
  -Width 1440 -Height 900
```

Each frame opens the open-top magic-door cinematic at an exact progress value, so
two runs are directly comparable even when the machine renders at different
speeds. The older camera-calibration room remains available at
`tools/scribble-bridge-preview.html`.

Pass `-OutputDirectory` to retain separate comparison sets, or `-BrowserPath`
when Edge/Chrome is installed in a non-standard location.
