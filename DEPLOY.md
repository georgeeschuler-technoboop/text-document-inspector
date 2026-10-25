# Deploy the approved Inspector UI

## Recommended: GitHub → Netlify

1. Unzip Inspector-Netlify-v1.3.0.zip.
2. Put the extracted contents in a dedicated GitHub repository. Keep netlify.toml at the repository root, alongside dist, netlify, and backend. Do not upload the personal standalone HTML, newsletter, or writing guide.
3. In Netlify choose Add new project → Import an existing project → GitHub. Select that repository.
4. Use these settings:
   - Base directory: blank (repository root)
   - Build command: blank
   - Publish directory: dist
   - Functions directory: netlify/functions (already configured)
5. Deploy. The document tool works immediately in the browser. Additional server inspection needs the Render setup described in README.md.
6. Open the deployed URL. Choose Try technical sample, select a zero-width-space change, switch between Original / Changes / Revised, and download the original, revised copy, and report. Upload a writing guide to verify reference loading. Reload: uploaded content should be gone.

## If using Netlify Drop

Drag only the extracted dist folder into Netlify Drop. This publishes the browser tool only. It does not deploy the inspection function or Python backend. Use the GitHub route for the complete planned setup.

## Render comes after the interface is online

Deploy backend/Dockerfile as a Docker web service from the same repository, with repository root as the Docker context. The backend container has not yet been built or live-tested. Configure its secret and copy the HTTPS service URL into Netlify as described in README.md. Do not paste service secrets into chat or commit them to the repository.

## Release checks

Approved Apple Modern UI: version 1.3.0. The deployment package excludes the personal draft, guide, and private editorial suggestions. Eight proxy checks passed with a mocked backend; live hosting verification is pending. The local edition's 17 engine checks also passed during the UI update.

Official instructions:
- https://docs.netlify.com/start/quickstarts/deploy-from-repository/
- https://docs.netlify.com/build/configure-builds/overview/
