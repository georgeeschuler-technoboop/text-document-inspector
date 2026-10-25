# Text & Document Inspector 1.3.0
Updated October 25, 2026.

## What works
- Browser-local text, Markdown and DOCX inspection, original preservation, selected edits, diff and report downloads.
- Load a UTF-8 .md/.txt writing guide (1 MB maximum). The report records its filename, full text and SHA-256. The guide stays in page memory and must be reloaded after refresh.
- Loading a changed guide disables the old curated suggestions. The app does not translate arbitrary prose guidelines into automated rules. A new editorial pass is required.
- Netlify inspection function forwards only `/inspect`, with `detect:false`. No cleanup, rewrite, or statistical detection calls.

## Deployment: two components
Netlify hosts the interface and JavaScript function. A separate HTTPS service runs upstream's Python server. Static HTML upload alone cannot deploy the function or Python backend.

1. Put this package in your own Git repository and connect it to Netlify (or deploy through Netlify CLI). `netlify.toml` sets the publish and function directories. No build command required.
2. Deploy `backend/Dockerfile` with a Docker-capable hosting service. It defaults to the documented upstream v0.7.0 tag; for production set WATERMARKS_REF to a reviewed full commit SHA. The build records the resolved commit in `/opt/ENGINE_COMMIT`. This container build has NOT been executed or verified here.
3. Set WATERMARKS_SERVER_API_KEY on the Python service to a long random secret. Do not run it publicly without that setting. Use the host's HTTPS endpoint; configure its port to match PORT (default 8765). Do not enable vendor APIs or rewrite backends.
4. In Netlify's function environment set:
   - WATERMARKS_SERVICE_URL: the Python service's HTTPS origin
   - WATERMARKS_SERVER_API_KEY: the same backend secret
   - INSPECTOR_ACCESS_TOKEN: a DIFFERENT long random password for the Inspector UI
   - WATERMARKS_ENGINE_VERSION: the resolved upstream commit from step 2
5. Redeploy Netlify after adding the environment settings. Enter INSPECTOR_ACCESS_TOKEN in the page's service password field and click Run additional inspection.
6. Verify a synthetic file first, then an authorized document. Confirm reports show the engine version and inspection-only mode. No live service has been connected or verified in this delivery.

The Netlify package deliberately contains no newsletter draft, original writing guide or curated private passages. Load your files after deployment. Local work is not sent unless Run additional inspection is pressed. That sends the original document, not the guide, to Netlify and the configured backend. Passwords stay in memory; the backend key is never returned to the browser. Server hosting providers' operational logging remains outside this app's control.

The backend's own API has broader functionality; keep its key server-side. The Netlify bridge exposes inspection only. Maximum server document size is 2 MB; local limit is 10 MB. HTTP errors, missing setup, and timeouts remain explicit. A public production deployment should also configure host-level rate limiting.

## Validation
17 original engine checks and 8 proxy tests pass using Node 24. Proxy tests use a mocked upstream response, not a running watermark-remover server. Browser UI verification was blocked by the browser tool's file-URL policy. Backend deployment, actual upstream compatibility and live Netlify behavior remain unverified.

Run `node test.cjs` and `node --test test-proxy.mjs` from the full development source. The public package omits the private test seed and original engine test; the proxy test is included and runnable.

## Sources
- https://github.com/guillaumemeyer/watermarks-remover
- https://docs.netlify.com/build/functions/get-started/

The upstream project has an MIT license; its source and license remain in the container checkout. Optional upstream tools have their own licensing. No upstream source code is copied into the browser engine.

## Version 1.3.0
Apple Modern palette, raised cards and controls, inset document fields, responsive workflow sidebar, collapsible server inspection, and original/changes/revised views. No deployment performed.
