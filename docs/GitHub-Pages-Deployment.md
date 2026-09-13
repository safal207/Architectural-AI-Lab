# GitHub Pages Deployment

The Dubai Luxury Villa viewer already builds successfully in GitHub Actions.

## One-time repository setting

GitHub Pages is not enabled for this repository yet. The repository owner must enable it once in GitHub:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions** as the source.
3. Save the setting.

The app build itself has already been validated in CI; the previous deployment attempt stopped only because the Pages site did not yet exist and the workflow token was not allowed to create it.

## Deploy after enablement

Open **Actions → Deploy Villa Viewer → Run workflow**.

The workflow will:

1. install the viewer dependencies;
2. validate `public/villa.gltf`;
3. run the production Vite build;
4. upload the static build;
5. publish it to GitHub Pages.

## Current deployment boundary

The viewer is a portfolio digital-twin prototype. The canonical 3D asset is `villa.gltf`, a deterministic concept-massing model. It is not BIM or construction documentation.
