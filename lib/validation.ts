import type { Opportunity, TenderOpportunity, RunInput } from "./types";
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    return u.href;
  } catch {
    return null;
  }
}
export function isOfficialProcurementUrl(value: string) {
  const u = safeUrl(value);
  if (!u) return false;
  const h = new URL(u).hostname;
  return h.endsWith(".gob.mx") || h === "gob.mx";
}
function sourceKey(value: unknown) {
  const safe = safeUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  for (const name of [...url.searchParams.keys()])
    if (/^utm_/i.test(name)) url.searchParams.delete(name);
  url.hash = "";
  return url.href;
}
function sameSource(a: unknown, b: unknown) {
  const key = sourceKey(a);
  return !!key && key === sourceKey(b);
}
export function actionableTender(t: TenderOpportunity, now = Date.now()) {
  return (
    !t.historical &&
    t.status === "open" &&
    t.procedureType === "public_tender" &&
    !!t.deadline &&
    /T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(t.deadline) &&
    new Date(t.deadline).getTime() > now &&
    !!t.deadlineSource &&
    isOfficialProcurementUrl(t.deadlineSource) &&
    t.amendmentsChecked
  );
}
export function sanitizeOpportunities(
  items: Opportunity[],
  sourceUrls: string[],
  now = Date.now(),
): Opportunity[] {
  const allowed = new Set(sourceUrls.map(sourceKey).filter(Boolean));
  const seen = new Set<string>();
  return items
    .map((item) => structuredClone(item))
    .filter((item) => {
      const key = (
        item.kind === "tender"
          ? item.procedureId
          : item.name + "|" + item.location
      )
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) return false;
      item.evidence = item.evidence.filter(
        (e) =>
          allowed.has(sourceKey(e.url)) &&
          !new URL(e.url).hostname.includes("doctoralia"),
      );
      if (!item.evidence.length) return false;
      if (item.kind === "tender") {
        item.evidence = item.evidence.filter((e) =>
          isOfficialProcurementUrl(e.url),
        );
        if (!item.evidence.length) return false;
        if (
          item.deadlineSource &&
          !item.evidence.some((e) => sameSource(e.url, item.deadlineSource))
        ) {
          item.deadlineSource = null;
          item.amendmentsChecked = false;
        }
        if (
          item.status === "open" &&
          item.deadline &&
          new Date(item.deadline).getTime() <= now
        )
          item.status = "closed";
        if (item.procedureType === "invitation" && item.status === "open")
          item.status = "invitation_only";
        if (item.status === "open" && !actionableTender(item, now)) {
          item.status = "unknown";
          item.gaps.push(
            "An open submission window and amendment history have not both been verified.",
          );
        }
        item.checklist = item.checklist.map((c) => ({
          ...c,
          status:
            c.status === "supported" &&
            !item.evidence.some((e) => sameSource(e.url, c.sourceUrl))
              ? "needs review"
              : c.status,
        }));
      } else {
        item.contacts = item.contacts.map((c) => {
          const supported =
            !!c.sourceUrl && item.evidence.some((e) => sameSource(e.url, c.sourceUrl));
          return {
            ...c,
            name: supported ? c.name : null,
            channel: supported ? c.channel : null,
            verified: supported && c.verified,
          };
        });
        if (item.kind === "physician") item.credentials = "unverified";
        if (!/\b(hola|estimad[oa]s?|buenos|buenas)\b/i.test(item.outreach) ||
            !/\b(productos|cat[aá]logo|presentar|evaluaci[oó]n|proveedores)\b/i.test(item.outreach)) {
          const question = item.kind === "physician"
            ? "¿Sería posible coordinar una breve presentación y confirmar quién evalúa los productos y quién gestiona la compra o el alta de proveedores en su práctica o institución?"
            : "¿Con quién podríamos revisar la evaluación técnica, los requisitos de compras y el alta de proveedores? Si corresponde, agradeceríamos el contacto del área de ingeniería biomédica.";
          item.outreach = `Hola, ${item.name}:\n\nSoy [tu nombre], de [empresa]. Encontré su referencia profesional en ${item.evidence[0].url}. Me gustaría presentar nuestro catálogo de productos médicos y conocer sus criterios de evaluación, sin presuponer una necesidad de compra actual.\n\n${question}\n\nPodemos compartir las fichas técnicas y revisar los requisitos aplicables antes de proponer una demostración.\n\nGracias,\n[tu nombre y contacto profesional]`;
        }
        if (item.sector === "public")
          item.gaps.push(
            "Clinical interest does not bypass public procurement or supplier approval. Confirm the institution’s formal purchasing route.",
          );
      }
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

export function matchesDirectTerritory(item: Opportunity, input: RunInput) {
  if (item.kind === "tender") return true;
  const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\b(ciudad de mexico|mexico city|distrito federal|cdmx)\b/g, "cdmx");
  const target = fold(input.readiness.territory).split(/[,;|]/)[0].trim();
  if (["mexico", "national", "nacional", "todo mexico"].includes(target)) return true;
  return !!target && fold(item.location).includes(target);
}
export function csvEscape(value: unknown) {
  const s = String(value ?? "");
  return (
    '"' + (/^[=+@\-\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"'
  );
}
export function exportCsv(items: Opportunity[]) {
  const kind = items[0]?.kind ?? "tender";
  const commonHeaders = [
    "Name",
    "Location",
    "Products",
    "Commercial hypothesis",
    "Unresolved questions",
    "Next step",
    "Last checked",
    "Historical context",
    "Sourced facts",
    "Sources",
  ];
  const modeHeaders =
    kind === "tender"
      ? [
          "Institution",
          "Purchasing unit",
          "Procedure ID",
          "Procedure type",
          "Status",
          "Scope",
          "Partida",
          "Submission deadline",
          "Deadline source",
          "Amendments checked",
          "Participation checklist",
          "Clarification questions",
        ]
      : kind === "physician"
        ? [
            "Specialty",
            "Affiliation",
            "Sector",
            "Credentials",
            "Proposed contact roles",
            "Public professional contact",
            "Purchasing authority",
            "Spanish outreach draft",
          ]
        : [
            "Institution type",
            "Sector",
            "DENUE ID",
            "Proposed contact roles",
            "Public professional contact",
            "Purchasing authority",
            "Spanish outreach draft",
          ];
  const rows: unknown[][] = [["Type", ...commonHeaders, ...modeHeaders]];
  for (const x of items) {
    const common = [
      x.kind,
      x.name,
      x.location,
      x.products.join("; "),
      x.hypothesis,
      x.gaps.join("; "),
      x.nextStep,
      x.checkedAt,
      x.historical ? "Historical; not a current lead" : "No",
      x.evidence.map((e) => e.claim + " [" + e.url + "]").join("; "),
      x.evidence.map((e) => e.url).join(" "),
    ];
    const contacts =
      x.kind !== "tender"
        ? [
            x.contacts
              .map((c) => c.role + (c.name ? ": " + c.name : ""))
              .join("; "),
            x.contacts.map((c) => c.channel ?? "Unverified").join("; "),
            "Unconfirmed",
            x.outreach,
          ]
        : [];
    const specific =
      x.kind === "tender"
        ? [
            x.institution,
            x.purchasingUnit,
            x.procedureId,
            x.procedureType,
            x.status,
            x.scope,
            x.partida,
            x.deadline,
            x.deadlineSource,
            x.amendmentsChecked ? "Yes" : "No",
            x.checklist.map((c) => c.requirement + ": " + c.status).join("; "),
            x.questions.join("; "),
          ]
        : x.kind === "physician"
          ? [x.specialty, x.affiliation, x.sector, x.credentials, ...contacts]
          : [x.institutionType, x.sector, x.denueId, ...contacts];
    rows.push([...common, ...specific]);
  }
  return "\uFEFF" + rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
}

export function matchesPurchasingScope(item: Opportunity, input: RunInput) {
  if (item.kind !== "tender") return true;
  const catalog = input.text.toLowerCase();
  if (
    item.scope === "maintenance" &&
    !/maintenance service|preventive maintenance|corrective maintenance|servicios? de mantenimiento|mantenimiento preventivo|mantenimiento correctivo|servicing contract/i.test(
      catalog,
    )
  )
    return false;
  if (
    item.scope === "rental" &&
    !/rental|renta|arrendamiento|alquiler/i.test(catalog)
  )
    return false;
  const claims = item.evidence.map((e) => e.claim).join(" ");
  if (
    input.families.some((f) => f.id === "monitoring") &&
    /computer monitors?|gaming monitors?|monitores? de comput|pantallas? de comput|environmental monitoring|monitoreo ambiental/i.test(
      claims,
    ) &&
    !/patient|paciente|signos vitales|clinical|clinico/i.test(claims)
  )
    return false;
  return true;
}
