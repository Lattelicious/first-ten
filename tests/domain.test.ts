import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeCatalog } from "../lib/catalog";
import {
  initialReadiness,
  type TenderOpportunity,
  type PhysicianLead,
} from "../lib/types";
import { exampleRun } from "../lib/examples";
import {
  actionableTender,
  sanitizeOpportunities,
  safeUrl,
  exportCsv,
  matchesPurchasingScope,
  matchesDirectTerritory,
} from "../lib/validation";
import { runInputSchema, researchOutput } from "../lib/server/schemas";

const now = Date.parse("2026-09-24T12:00:00Z");
const tender = (): TenderOpportunity => ({
  ...structuredClone(exampleRun("monitoring").results[0] as TenderOpportunity),
  historical: false,
  status: "open",
  deadline: "2026-10-10T12:00:00-06:00",
  deadlineSource: exampleRun("monitoring").results[0].evidence[0].url,
  amendmentsChecked: true,
});
const physician = () =>
  structuredClone(exampleRun("procedures").results[0] as PhysicianLead);
const clean = (x: TenderOpportunity | PhysicianLead) =>
  sanitizeOpportunities(
    [x],
    x.evidence.map((e) => e.url),
    now,
  )[0];

test("hospital monitoring recommends procurement and institutional contacts", () => {
  const [family] = analyzeCatalog(
    "Patient monitors and central monitoring stations",
    initialReadiness,
  );
  assert.equal(family.primary, "tenders");
  assert.equal(family.secondary, "institutions");
  assert.match(family.caveat, /buying authority/);
  assert.ok(family.unknowns.length);
});
test("procedure supplies recommend clinical conversation with a purchasing caveat", () => {
  const [f] = analyzeCatalog(
    "Laparoscopic trocars and biopsy forceps",
    initialReadiness,
  );
  assert.equal(f.primary, "physicians");
  assert.equal(f.secondary, "institutions");
  assert.match(f.caveat, /public procurement/);
});
test("mixed catalogs retain separate family recommendations", () => {
  const families = analyzeCatalog(
    "Hospital patient monitors\nLaparoscopic trocars",
    initialReadiness,
  );
  assert.deepEqual(
    families.map((f) => f.primary),
    ["tenders", "physicians"],
  );
});
test("office monitoring does not automatically become a tender route", () => {
  const f = analyzeCatalog(
    "Home-use pulse oximeter and portable blood pressure monitor for a consultorio",
    initialReadiness,
  );
  assert.equal(f.length, 1);
  assert.equal(f[0].id, "office");
  assert.equal(f[0].primary, "institutions");
});
test("private-sector preference and user route overrides remain valid", () => {
  const families = analyzeCatalog("Hospital patient monitors", {
    ...initialReadiness,
    publicSector: "no",
  });
  assert.equal(families[0].primary, "institutions");
  families[0].primary = "physicians";
  assert.equal(
    runInputSchema.parse({
      text: "Hospital patient monitors",
      families,
      route: "physicians",
      readiness: initialReadiness,
    }).families[0].primary,
    "physicians",
  );
});
test("unrelated screen monitor receives a provisional classification", () => {
  assert.equal(
    analyzeCatalog(
      "Computer monitor for office accounting",
      initialReadiness,
    )[0].primary,
    "institutions",
  );
  assert.equal(
    analyzeCatalog("Gaming monitor display", initialReadiness)[0].id,
    "review",
  );
});
test("open tender requires a verified future deadline and amendments", () => {
  assert.equal(actionableTender(tender(), now), true);
  for (const change of [
    { amendmentsChecked: false },
    { deadline: null },
    { deadline: "2026-10-10" },
    { deadline: "invalid" },
    { deadlineSource: "https://example.com/date" },
  ]) {
    const x = { ...tender(), ...change };
    assert.equal(actionableTender(x, now), false);
    assert.equal((clean(x) as TenderOpportunity).status, "unknown");
  }
});
test("expired, awarded, invitation and historical procedures cannot be actionable", () => {
  assert.equal(
    (
      clean({
        ...tender(),
        deadline: "2026-09-01T00:00:00Z",
      }) as TenderOpportunity
    ).status,
    "closed",
  );
  assert.equal(
    (clean({ ...tender(), procedureType: "invitation" }) as TenderOpportunity)
      .status,
    "invitation_only",
  );
  for (const x of [
    { ...tender(), historical: true },
    { ...tender(), status: "awarded" as const },
    { ...tender(), status: "preliminary" as const },
  ])
    assert.equal(actionableTender(x, now), false);
});
test("changed deadlines need a consulted official source", () => {
  const x = tender();
  x.deadlineSource = "https://imss.gob.mx/unconsulted-amendment.pdf";
  const result = clean(x) as TenderOpportunity;
  assert.equal(result.deadlineSource, null);
  assert.equal(result.amendmentsChecked, false);
  assert.equal(result.status, "unknown");
});
test("citation tracking parameters do not discard a consulted document; identifying parameters stay distinct", () => {
  const p = physician();
  const url = p.evidence[0].url;
  assert.equal(sanitizeOpportunities([p], [url + "?utm_source=openai#profile"], now).length, 1);
  assert.equal(sanitizeOpportunities([p], [url + "?procedure=another-record"], now).length, 0);
  const t = tender();
  t.deadlineSource += "?utm_source=openai";
  const result = sanitizeOpportunities([t], t.evidence.map(e => e.url), now)[0] as TenderOpportunity;
  assert.equal(result.status, "open");
  assert.ok(result.deadlineSource);
});
test("direct leads stay in the requested city and English analysis becomes an editable Spanish draft", () => {
  const p = physician();
  const input = exampleRun("procedures").input;
  assert.equal(matchesDirectTerritory({ ...p, location: "CDMX, México" }, input), true);
  assert.equal(matchesDirectTerritory({ ...p, location: "Huixquilucan, Estado de México" }, input), false);
  p.outreach = "Physician profile is suitable for a commercial conversation. Ask for the correct contact.";
  const clean = sanitizeOpportunities([p], p.evidence.map(e => e.url), now)[0] as PhysicianLead;
  assert.match(clean.outreach, /^Hola/);
  assert.match(clean.outreach, /\[tu nombre\]/);
  assert.match(clean.outreach, /quién gestiona la compra/);
});
test("unsourced checklist requirements cannot be marked supported", () => {
  const x = tender();
  x.checklist = [
    {
      requirement: "Supplier authorization",
      status: "supported",
      sourceUrl: "https://imss.gob.mx/unread.pdf",
    },
  ];
  assert.equal(
    (clean(x) as TenderOpportunity).checklist[0].status,
    "needs review",
  );
});
test("unconsulted claims and Doctoralia content are excluded", () => {
  const p = physician();
  assert.equal(sanitizeOpportunities([p], [], now).length, 0);
  p.evidence[0].url = "https://www.doctoralia.com.mx/example";
  assert.equal(clean(p), undefined);
});
test("unsafe protocols and authority-spoofing URLs are rejected", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://example.com",
    "https://user:password@example.com",
  ])
    assert.equal(safeUrl(url), null);
  const t = tender();
  t.evidence.forEach((e) => (e.url = "https://imss.gob.mx.evil.example/award"));
  assert.equal(clean(t), undefined);
});
test("invalid duplicate does not suppress a supported candidate", () => {
  const p = physician(),
    bad = physician();
  bad.evidence = [];
  assert.equal(
    sanitizeOpportunities(
      [bad, p, physician()],
      p.evidence.map((e) => e.url),
      now,
    ).length,
    1,
  );
});
test("unsourced contact names and channels are removed; credentials remain unverified", () => {
  const p = physician();
  p.credentials = "verified";
  p.contacts = [
    {
      role: "purchasing contact",
      name: "Invented person",
      channel: "555",
      sourceUrl: "https://example.com/unread",
      verified: true,
    },
  ];
  const result = clean(p) as PhysicianLead;
  assert.equal(result.contacts[0].name, null);
  assert.equal(result.contacts[0].channel, null);
  assert.equal(result.contacts[0].verified, false);
  assert.equal(result.credentials, "unverified");
});
test("public affiliation does not bypass procurement", () => {
  const p = physician();
  p.sector = "public";
  assert.ok(
    (clean(p) as PhysicianLead).gaps.some((g) => g.includes("does not bypass")),
  );
});
test("examples use separate modes and preserve historical scope", () => {
  for (const name of ["monitoring", "procedures"] as const)
    for (const route of ["tenders", "physicians", "institutions"] as const) {
      const r = exampleRun(name, route);
      researchOutput.parse({
        opportunities: r.results,
        limitations: r.limitations,
      });
      assert.ok(r.sample);
      assert.equal(r.costUsd, 0);
    }
  const history = exampleRun("monitoring").results[0] as TenderOpportunity;
  assert.equal(history.scope, "maintenance");
  assert.equal(history.historical, true);
  assert.equal(actionableTender(history, now), false);
});
test("export neutralizes spreadsheet formulas and escapes multiline text", () => {
  const p = physician();
  p.name = '=HYPERLINK("https://evil.example")';
  p.gaps = ["One\nTwo"];
  const csv = exportCsv([p]);
  assert.ok(csv.includes('"\'=HYPERLINK(""https://evil.example"")"'));
  assert.ok(csv.includes('"One\nTwo"'));
});

test("maintenance, rental, and computer screens do not become equipment-purchase leads", () => {
  const x = tender(),
    input = exampleRun("monitoring").input;
  assert.equal(matchesPurchasingScope(x, input), false);
  x.scope = "rental";
  assert.equal(matchesPurchasingScope(x, input), false);
  x.scope = "purchase";
  assert.equal(matchesPurchasingScope(x, input), true);
  x.evidence[0].claim = "Purchase of computer monitors for accounting";
  x.evidence = x.evidence.slice(0, 1);
  assert.equal(matchesPurchasingScope(x, input), false);
  x.scope = "maintenance";
  assert.equal(
    matchesPurchasingScope(x, {
      ...input,
      text: "Preventive maintenance services for computer monitors",
    }),
    false,
  );
});
