# Evaluation and cost record

Evaluation date: 24 September 2026.

## Automated checks

The suite exercises the actual API handler and business code inside a local Cloudflare Worker with D1/R2. Provider responses are controlled fixtures; these tests do not call the live OpenAI API.

Covered:

- Hospital monitoring, procedural, mixed, office equipment and private-sector preference routing; editable recommendations.
- Deadline/timezone validation, expired dates, invitation-only procedures, historical/awarded/preliminary states, unconsulted amendments and unsupported requirements.
- Source allowlists, equivalent tracking URLs, Doctoralia exclusion, duplicate handling, unsupported contact removal, territory matching, Spanish draft fallback, public-affiliation caveats and unverified credentials.
- Maintenance/rental/equipment mismatches and unrelated computer monitors.
- Signed-out access, foreign-origin writes, cross-user read/advance/cancel/export/delete isolation.
- Concurrent daily/active-run claims, atomic shared-budget reservations, one-time settlement and one-time carryover of owner testing costs.
- Two-stage progress/reload recovery, failure visibility, cancellation, CSV escaping and deletion without quota reset.
- Private CSV/R2 uploads, corrupted/oversized files, text PDFs at 1/20 pages, rejection at 21 pages, and unreadable/image-only text.
- Official-cache domain validation and separate dataset dates.

Result: **34 tests passed**, TypeScript checks passed, and the production build completed.

Commands: `npm test`, `npm run typecheck`, `npm run build`.

## Browser checks

Checked signed-out examples, mixed-family review, primary-route overrides, physician evidence drawer, editable Spanish outreach and the copy-success state, a confirmed mode-specific CSV download, catalog-file upload, WebMCP staging/invalid-input rejection, local development sign-in and private-workspace view. Browser errors were absent during these checks. A 390-pixel mobile viewport had no horizontal overflow. This is targeted accessibility QA, not a full accessibility certification.

## Hosted verification

The public Sites deployment was verified on 24 September 2026. Signed-out visitors receive the workspace and reviewed example CSVs; private research returns HTTP 401. ChatGPT sign-in completed successfully, and a neutral CSV catalog was uploaded and shown in the authenticated saved workspace. The resulting account identifier was used to configure owner access; it was not guessed from an email or local test fixture. D1 migrations and private upload storage are working in production.

The school-neutral public repository and GitHub profile link to the published showcase. One neutral `test-catalog.csv` remains in the owner’s private workspace from production verification.

## Live research evaluation

The funded project key completed both research modes on 24 September 2026 through the actual application API, local Worker and live OpenAI Responses API. Inputs were neutral example catalogs. No outreach or bids were sent.

| Run | Estimated cost | Elapsed time | Outcome |
|---|---:|---:|---|
| Monitoring, initial | $0.142178 | 173.9 s including debugging pause | Completed with zero qualifying opportunities after a schema correction and resuming paid discovery |
| Physicians, initial | $0.122154 | 38.0 s | Six candidates; review found one outside the requested city and English draft text |
| Monitoring, corrected | $0.143195 | 45.8 s | Completed with zero qualifying opportunities and explicit coverage limitations |
| Physicians, corrected | $0.203596 | 53.2 s | Six CDMX physicians; all public source/contact claims manually audited; Spanish drafts |
| **Local test total** | **$0.611123** | | Charged to the $5 owner allocation |

The tender test did not verify a current open opportunity. Historical notices, insufficiently verified records and unsuitable scopes did not become actionable tender cards. This is a usable empty-result outcome, not evidence that no relevant tenders exist. Coverage and positive tender-retrieval quality remain limited by the consulted sources.

The first live evidence stage exposed a strict-output schema incompatibility: OpenAI rejects the URI format annotation emitted by the schema generator. The adapter now uses an HTTPS pattern and preserves runtime URL validation. Known rejected request creation does not consume the reserved amount; ambiguous outcomes still retain conservative accounting. The paid discovery stage was resumed rather than purchased again.

Source comparison now ignores tracking parameters without discarding identifying query parameters. Direct results must match the requested city/state. The prompt separates current affiliation from historical training, and unsuitable outreach text is replaced with a fact-limited editable Spanish introduction. Regression tests cover these corrections. City matching is textual, not geocoded; use one city or state per run.

### Manual audit of the corrected physician run

The following public primary pages supported the displayed specialty/services, location and professional contact channels when checked on 24 September 2026. Credential status remained unverified, and no purchasing authority or buying intent was asserted. These private run results are not automatically published as showcase examples.

| Public source | Claims checked |
|---|---|
| [Rafael Sepúlveda Rodríguez](https://www.dr-sepulveda.com/) | Laparoscopy, CDMX practice, listed professional phone/email |
| [Eduardo Gil Hurtado](https://dreduardogil.com/) | General/laparoscopic surgery, Hospital Ángeles Universidad, CDMX, listed phone/email |
| [César A. Sánchez Camarena](https://drsanchezcamarena.com/) | General/laparoscopic surgery, Hospital MAC address in CDMX, listed phone |
| [Diana Montes](https://www.cirugiademinimainvasion.mx/) | General/laparoscopic surgery, Hospital Ángeles México, CDMX, listed phone; self-described certification was not independently verified |
| [Rubens de la Vega Mireles](https://gastrorubensdelavega.com/) | Gastroenterology/endoscopy, Polanco/Roma CDMX offices, public WhatsApp contact route |
| [José Álvaro Burgos Zuleta](https://burgosclinica.com/) | Laparoscopy/endoscopy, CDMX clinic address and listed phone channels |

Patient reviews, ratings, testimonials, appointment availability and claimed case counts were not used to infer buying intent or procedure volume. Contact facts can change after this audit.

## Allowance and limitations

Budget configuration: $20 visitors + $5 owner testing/demonstrations. Each run reserves $2 atomically. Usage estimates use reported tokens, the configured model rates and actual web-search call count; they are not a provider invoice or provider-enforced cap. The $0.611123 local evaluation cost is carried into the hosted owner ledger once at initialization. The visitor allocation is untouched by these tests.

An earlier unfunded request returned `credit_balance_exhausted`, no usage and no results in approximately 6.5 seconds. Its uncharged reservation was released. The failure path remains covered by a regression test.

DENUE remains unconfigured. Its absence is a visible source-coverage limitation, not substituted with fabricated establishment records. This is a small smoke-test sample, not a precision/recall benchmark or an exhaustive market search.
