# Text & Document Inspector 1.4.0

## Workflow
Add pasted text or a UTF-8 text, Markdown, or Word document. Upload prepares the source; Review document runs selected checks. Original bytes remain separately available. Editing extracted text changes the source to a text copy. Changed sources, guides, or check settings require a fresh review before export.

- Hidden characters & metadata: browser-local Unicode findings and Word properties. Explicitly selected character changes only.
- Writing patterns & watermark tests: sends the reviewed UTF-8 text to the authenticated Render service via Netlify /inspect with detect:true. Word body text is extracted locally; the Word container and guide are not sent. Displays descriptive stylometry metrics and clickable phrase spans. The engine composite is available only in the full report, not presented as an authorship probability.
- Writing style: guides are references, not automatically compiled into checks. The user can explicitly enable em-dash review. The private local edition also supports the bundled exact-anchor editorial suggestions; those passages are not in this deployment.

## Detector assessment
Upstream v0.7.0 already computes stylometry during text inspection even when detect:false. Version 1.4 exposes those previously buried measurements and requests detector results using detect:true.
MarkLLM requires its optional runtime and matching generation configuration / keys. Gumbel requires the generation key and compatible tokenizer / PRF. Neither is configured on this service, so both correctly report unavailable. The claude-text adapter in the installed release is a placeholder. No generic unknown-vendor watermark detection is claimed. No cleaning, rewriting, model, or external vendor API is called by this app.

## Connection
Connect service verifies the password using an authenticated health check. Optional sessionStorage remembers only the UI access token in this browser tab; no documents or guides are persisted. Disconnect clears it. Server checks retry up to three times after transient timeouts / 502 errors, with 5-second gaps, to handle free Render wake-up. Each request has a 20-second upstream timeout. Server text limit: 2 MB. Local document limit: 10 MB.

## Hosting
Netlify publish directory: dist. Functions directory: netlify/functions. No build command. Render uses backend/Dockerfile from repository root. Existing environment values remain:
- Netlify Functions: INSPECTOR_ACCESS_TOKEN, WATERMARKS_SERVICE_URL, WATERMARKS_SERVER_API_KEY, WATERMARKS_ENGINE_VERSION.
- Render: WATERMARKS_SERVER_API_KEY.
Never commit secrets. Private drafts and guides are excluded from dist/seed.js.

## Validation
node test-review.cjs (8 checks)
node test-proxy.mjs (11 checks)
The private development source additionally runs test.cjs (17 engine checks). Review-model checks cover unavailable detectors, scheme-scoped verdicts, astral Unicode offsets, and selected-change summaries. Proxy tests cover authenticated connection, detection opt-in, rejection of unsupported formats/actions, limits and failures.
