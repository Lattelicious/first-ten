# Evaluation and cost record

Evaluation date: 24 September 2026.

## Automated checks

The suite exercises the actual API handler and business code inside a local Cloudflare Worker with D1/R2. Provider responses are controlled fixtures; these tests do not call the live OpenAI API.

Covered:

- Hospital monitoring, procedural, mixed, office equipment and private-sector preference routing; editable recommendations.
- Deadline/timezone validation, expired dates, invitation-only procedures, historical/awarded/preliminary states, unconsulted amendments and unsupported requirements.
- Source allowlists, Doctoralia exclusion, duplicate handling, unsupported contact removal, public-affiliation caveats and unverified credentials.
- Maintenance/rental/equipment mismatches and unrelated computer monitors.
- Signed-out access, foreign-origin writes, cross-user read/advance/cancel/export/delete isolation.
- Concurrent daily/active-run claims, atomic shared-budget reservations and one-time settlement.
- Two-stage progress/reload recovery, failure visibility, cancellation, CSV escaping and deletion without quota reset.
- Private CSV/R2 uploads, corrupted/oversized files, text PDFs at 1/20 pages, rejection at 21 pages, and unreadable/image-only text.
- Official-cache domain validation and separate dataset dates.

Result: **30 tests passed**, TypeScript checks passed, and the production build completed.

Commands: `npm test`, `npm run typecheck`, `npm run build`.

## Browser checks

Checked signed-out examples, mixed-family review, primary-route overrides, physician evidence drawer, editable Spanish outreach and the copy-success state, a confirmed mode-specific CSV download, catalog-file upload, WebMCP staging/invalid-input rejection, local development sign-in and private-workspace view. Browser errors were absent during these checks. A 390-pixel mobile viewport had no horizontal overflow. This is targeted accessibility QA, not a full accessibility certification.

## Measured costs and live gate

**Live research spend measured by this implementation: $0.** No successful API key provision or live research request has occurred. Attempts to create the key were rejected by OpenAI Platform without a detailed error. No secret was created or written by this workflow. Live smoke tests in both modes remain pending; model quality, live latency and per-run live cost have not been measured.

Budget configuration: $20 visitors + $5 owner testing/demonstrations. Each run reserves $2 atomically. Usage estimates use the configured model's input/output rates and actual web-search call count; ambiguous outcomes retain a conservative charge. These estimates must be reconciled against provider billing after the first live runs. The hosted app must not claim these fixture tests as live results.

## Required before the hosted showcase is complete

1. Provision the approved key and store it as a hosted secret.
2. Configure the actual owner identifier and runtime settings; configure DENUE or visibly retain its coverage limitation.
3. Run one live procurement and one live direct-contact smoke test within the $5 owner allocation, recording costs and latency.
4. Manually review returned claims and publish only supported results.
5. Publish through Sites and verify the production ChatGPT sign-in boundary. Link the successful hosted deployment from the GitHub showcase.
