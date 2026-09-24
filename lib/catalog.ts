import type { ProductFamily, Readiness, Route } from "./types";
const groups = [
  {
    id: "monitoring",
    name: "Hospital patient monitoring",
    test: /central.{0,20}monitor|(?:patient|hospital|multiparameter|vital.sign).{0,25}monitor|monitor.{0,30}(patient|paciente|signos|vital|multipar[aá]metr|hospital)|telemetr|icu|intensive care|cuidados intensivos/i,
    primary: "tenders",
    secondary: "institutions",
    specialties: ["Critical care", "Anesthesiology", "Emergency medicine"],
    requirements: [
      "Installation and training",
      "Local maintenance",
      "Accessory and system compatibility",
    ],
    rationale:
      "Hospital-scale monitoring fits institutional purchasing and public procurement research.",
    caveat:
      "Biomedical engineering and purchasing may control approval. A physician’s interest does not establish buying authority.",
  },
  {
    id: "procedures",
    name: "Procedure-specific supplies",
    test: /laparosc|endoscop|surgic|quir[uú]rg|trocar|sutur|biops|catheter|cat[eé]ter|implant|orthop|ortop[eé]d|hemost|electrosurg/i,
    primary: "physicians",
    secondary: "institutions",
    specialties: ["General surgery", "Relevant procedural specialty"],
    requirements: [
      "Procedure and instrument compatibility",
      "Product documentation",
      "Training or demonstration",
    ],
    rationale:
      "Procedure-specific products benefit from discussion with clinicians who use or select them.",
    caveat:
      "The clinician may be an advocate rather than the buyer. Hospital approval and public procurement can still be required.",
  },
  {
    id: "office",
    name: "Office and practice equipment",
    test: /office|consultorio|exam(ination)? table|mesa de exploraci[oó]n|otoscop|stethoscop|estetoscop|tensi[oó]metro|blood pressure|pulse oximet|ox[ií]metro|portable|port[aá]til|home.?use|domicili/i,
    primary: "institutions",
    secondary: "physicians",
    specialties: ["General practice", "Outpatient care"],
    requirements: [
      "Practice ownership and purchasing route",
      "Training and warranty",
    ],
    rationale:
      "Small practice equipment can fit direct clinic or owner-physician conversations.",
    caveat:
      "Confirm ownership and actual product use. A basic monitoring device alone is not a reason to prioritize tenders.",
  },
] as const;
export function analyzeCatalog(
  text: string,
  readiness: Readiness,
): ProductFamily[] {
  const lines = text
    .split(/\n|;/)
    .map((x) => x.trim())
    .filter(Boolean);
  const found = groups.flatMap((g) => {
    const matches = lines.filter((line) => g.test.test(line));
    if (!matches.length) return [];
    const relevant =
      g.id === "monitoring"
        ? matches.filter(
            (l) =>
              !/home.?use|domicili|small practice|consultorio|pulse oximet|ox[ií]metro/i.test(
                l,
              ),
          )
        : matches;
    if (!relevant.length) return [];
    let primary: Route = g.primary;
    if (primary === "tenders" && readiness.publicSector === "no")
      primary = "institutions";
    return [
      {
        id: g.id,
        name: g.name,
        description: relevant.join("\n").slice(0, 4000),
        specialties: [...g.specialties],
        requirements: [...g.requirements],
        primary,
        secondary:
          g.secondary === primary ? ("physicians" as Route) : g.secondary,
        rationale:
          primary !== g.primary
            ? "You prefer private-sector sales; start with hospital purchasing and biomedical engineering."
            : g.rationale,
        caveat: g.caveat,
        unknowns: [
          ...(readiness.authorization !== "yes"
            ? ["Manufacturer authorization has not been confirmed."]
            : []),
          ...(readiness.regulatory !== "yes"
            ? ["Applicable product documentation needs review."]
            : []),
          ...(g.id === "monitoring" && readiness.service !== "yes"
            ? ["Local installation and service capacity needs review."]
            : []),
        ],
      },
    ];
  });
  return found.length
    ? found
    : [
        {
          id: "review",
          name: "Products to review",
          description: text.slice(0, 4000),
          specialties: [],
          requirements: ["Confirm intended use and customer setting"],
          primary: "institutions",
          secondary: "physicians",
          rationale:
            "The catalog needs a clearer product or intended-use description before a confident route recommendation.",
          caveat:
            "This is a provisional starting route, not a verified market recommendation.",
          unknowns: [
            "Product classification and intended use are unconfirmed.",
          ],
        },
      ];
}
