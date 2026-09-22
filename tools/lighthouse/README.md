# Lighthouse checks

[Run history and reports](https://github.com/safal207/Architectural-AI-Lab/actions/workflows/lighthouse.yml)

Lighthouse checks Performance, Accessibility, Best Practices and SEO. Every run audits three page loads for each of two profiles: simulated mobile and desktop. The GitHub Actions summary shows the median of each score and metric. Download `lighthouse-<target>-<profile>` from the run's Artifacts to open the full HTML reports or inspect the raw JSON. Reports are retained for 30 days.

## When it runs

- Pull requests affecting the viewer or Lighthouse tooling: audit a local production build of the proposed changes.
- Successful `Deploy Villa Viewer` publication on `main`: audit the public GitHub Pages URL.
- Actions → Lighthouse → Run workflow: choose `production` (the live site) or `local` (a build of the selected ref).

Production reports measure the public URL at collection time. Another deployment can change that URL during a run, so they are not immutable proofs of a specific commit. PR reports use the checked-out merge revision. Hash links such as `#journey` share the same page and are not counted as separate pages.

## Reading the result

Scores below 90 produce advisory warnings while the baseline is established. A green workflow means the audit completed; it does not mean every target scored 90+. Failed page loads, incomplete runs, missing scores, and Lighthouse errors fail the job. No audit failures are suppressed. The measured values and Lighthouse warnings remain visible in the summary and artifacts.

These are lab measurements under Lighthouse's simulated device/network settings. They complement the existing Explore/3D, layout and manual regression tests; they do not prove that walking, touch gestures or a project brief work. Real-user Core Web Vitals require separate field data. The tooling has its own pinned dependency and lockfile and is not bundled into the website.

## Local use

Use Node 22 and a Chrome installation. From the repository root:

```sh
npm ci --prefix tools/lighthouse
npm ci --prefix projects/Dubai-Luxury-Villa-AI/web-viewer/app
npm run build --prefix projects/Dubai-Luxury-Villa-AI/web-viewer/app
cd tools/lighthouse
npm test
npm run audit
npm run summary
```

Defaults: `LIGHTHOUSE_PROFILE=mobile`, `LIGHTHOUSE_TARGET=local`. Set profile to `desktop` for the desktop preset; set target to `production` for the public site. Set `CHROME_PATH` if Chrome is not found automatically. On PowerShell, set variables with `$env:LIGHTHOUSE_PROFILE = 'desktop'`; on POSIX shells use `export LIGHTHOUSE_PROFILE=desktop`. Each collection replaces `.lighthouseci`; save the artifacts before changing profiles. The Actions matrix uses separate runners for the two profiles.

[Official Lighthouse CI configuration](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md) · [Lighthouse measurement variability](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
