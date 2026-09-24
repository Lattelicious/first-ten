# First Ten

A catalog-to-opportunity workspace for medical distributors in Mexico. First Ten recommends a sales route, then researches up to ten supported opportunities while separating **clinical interest**, **purchasing authority**, and **procurement eligibility**.

**Status:** interactive showcase with reviewed examples, private catalog storage and automated coverage. The OpenAI connection is configured; live research is paused until the API account has credits. Both live research modes still require successful end-to-end evaluation before being presented as validated.

[Open First Ten](https://first-ten.casagarciachavez.chatgpt.site) · [Evaluation record](docs/EVALUATION.md)

## The workflow

1. Paste products or upload a CSV/text PDF (10 MB, up to 20 PDF pages).
2. Review product families, intended specialties, service needs and unknown supplier readiness.
3. Override the primary/complementary recommendation for each family.
4. Select **Licitaciones** or **Contacto directo → Médicos / Hospitales y clínicas**.
5. Inspect the source-backed brief, unresolved questions and next step. Copy an editable Spanish draft or export CSV.

Hospital-scale patient monitoring usually starts with procurement plus institutional purchasing/biomedical engineering. Procedure-specific supplies usually start with clinicians plus the facility's buying process. Mixed catalogs keep separate family recommendations. Office equipment does not automatically become a public-tender opportunity. These are initial commercial heuristics, not universal rules.

## What distinguishes the results

- Tender records distinguish purchases, maintenance, rental, consumables and bundled services. An open label requires a future deadline, an official consulted source and checked amendments. Invitations, awards, preliminary notices and uncertain records stay distinct.
- A documented requirement does not mean the supplier meets it. Requirements remain supported, missing or in need of review.
- Physician and institution records have different types. Contact roles remain proposed until authority is established. Public affiliations do not bypass procurement.
- Sources, commercial hypotheses and unresolved questions are displayed separately. A short or empty list is preferable to invented leads.
- No messages, bids or CRM updates are sent. Direct commercial contact is different from **adjudicación directa**.

## Examples

The monitoring example shows a historical IMSS **maintenance** award, explicitly excluded from the active opportunity count, and a separate hospital-contact view. The procedure example shows two physician profiles and a separate historical institutional procurement example. Catalogs and the supplier name are fictional; professional and institutional references are real and do not imply endorsement or buying intent. See the [source audit](docs/SOURCES.md).

## Implementation

React and TypeScript on a Sites/Vinext Cloudflare Worker; ChatGPT sign-in; D1 for private records and usage accounting; private R2 for uploaded bytes. Two bounded OpenAI stages perform discovery and evidence review. Progress is stored between requests, protected by per-run leases, and resumes when a saved run is reopened. See [architecture](docs/ARCHITECTURE.md).

The initial allowance is **$25**, split into a $20 visitor pool and $5 owner pool. A visitor gets one run per UTC day and one active run. Every run atomically reserves $2 before provider work. These are application estimates, not a provider-enforced billing cap. See [evaluation and cost accounting](docs/EVALUATION.md).

## Local development

Node 22.13 or later is required.

```sh
npm ci
npm run build
npm run typecheck
npm test
npm run dev
```

Local preview uses Sites' development sign-in fixture; hosted authentication uses the Sites gateway. Never deploy the development server as an independent public service.

Apply the generated migrations to the local D1 binding before exercising private records. Production migrations are packaged with the Sites build. The source schema is `db/schema.ts`; use `npm run db:generate` after schema changes.

Runtime names are documented in `.env.example`. Keep real values in ignored local environment files and hosted secrets. `OPENAI_API_KEY` powers research; `DENUE_API_TOKEN` enables optional establishment discovery. `OWNER_USER_ID` must be the actual authenticated owner identifier. Without it, nobody receives owner privileges. Live research stays paused unless the key exists and `LIVE_RESEARCH_ENABLED=true`.

## Scope and limitations

Procurement coverage starts with federal Compras MX, issuing institutions, and Nuevo León. No undocumented Compras MX API is assumed. An owner can import a dated, filtered official CSV for discovery context. DENUE identifies establishments, not named decision-makers; unavailable credentials or sources produce visible limitations. Doctoralia is an external reference only, never a scraping dependency. Credentials are unverified unless checked independently.

The app does not establish medical suitability, compliance, eligibility, current buying intent, or the completeness of market coverage. Source auditing and live evaluation remain necessary before relying on a proposed opportunity.
