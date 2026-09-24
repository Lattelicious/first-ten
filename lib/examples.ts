import type {
  Evidence,
  Opportunity,
  ResearchRun,
  Route,
  TenderOpportunity,
  PhysicianLead,
} from "./types";
import { initialReadiness } from "./types";
import { analyzeCatalog } from "./catalog";
const CHECKED = "2026-09-24T09:24:00Z";
const physicianUrl =
  "https://hospitalangeles.com/medico/jorge-alberto-perez-samperio";
const secondUrl =
  "https://hospitalangeles.com/medico/mauricio-rodriguez-gonzalez";
const hospitalUrl =
  "https://www.christusmuguerza.com.mx/hospital-alta-especialidad";
const awardUrl =
  "https://reposipot.imss.gob.mx/unidad_trans/UMAE_ESP_YUC/2025/LA-50-GYR-050GYR063-N-46-2025/FALLO.pdf";
const procedureUrl =
  "https://reposipot.imss.gob.mx/OOAD/UMAE/ESP-Puebla/UMAE%20HE%20PUEBLA/2026/Expediente/LA-046-N10-26_Junta.pdf";
const fact = (
  id: string,
  claim: string,
  url: string,
  title: string,
): Evidence => ({
  id,
  claim,
  url,
  title,
  publishedAt: null,
  retrievedAt: CHECKED,
});
export const sampleCatalogs = {
  monitoring:
    "Fictional supplier: Norte Medical Supply (demonstration only).\nMultiparameter patient monitors for hospital intensive care.\nCentral monitoring stations and compatible monitoring accessories.\nProduct compatibility, regulatory documentation, distribution rights and service capacity require confirmation.",
  procedures:
    "Fictional supplier: Norte Medical Supply (demonstration only).\nLaparoscopic surgical instruments and trocars.\nEndoscopic biopsy forceps and procedure-specific consumables.\nExact compatibility, distribution rights and regulatory documentation require confirmation.",
};
const historicalMonitor: TenderOpportunity = {
  id: "example-monitor-history",
  kind: "tender",
  name: "Monitor maintenance — historical procurement example",
  institution: "IMSS · UMAE Hospital de Especialidades, Mérida",
  purchasingUnit: "Departamento de Abastecimiento / Oficina de Adquisiciones",
  location: "Mérida, Yucatán · outside the Monterrey target",
  procedureId: "LA-50-GYR-050GYR063-N-46-2025",
  procedureType: "public_tender",
  status: "awarded",
  scope: "maintenance",
  partida: null,
  deadline: null,
  deadlineSource: null,
  amendmentsChecked: false,
  products: ["Patient monitoring"],
  hypothesis:
    "This record explains the institutional buying route, but it is NOT a current equipment-sales lead: the scope is maintenance and the award is historical.",
  evidence: [
    fact(
      "m1",
      "The IMSS award concerns preventive/corrective maintenance of 35 Medica D monitors, Logicare and Vitacare models.",
      awardUrl,
      "IMSS award document",
    ),
    fact(
      "m2",
      "The award records disqualification related to the required manufacturer or authorized-distributor support.",
      awardUrl,
      "IMSS award document",
    ),
  ],
  gaps: [
    "Closed historical procedure; do not attempt to submit a bid.",
    "Maintenance scope differs from a new-equipment catalog.",
    "Catalog brands and maintenance authorization are unknown.",
  ],
  nextStep:
    "Use this record to understand documentation requirements. Search current purchase procedures before selecting an opportunity.",
  checkedAt: CHECKED,
  historical: true,
  checklist: [
    {
      requirement:
        "Manufacturer or authorized-distributor support for the specified equipment",
      status: "supported",
      sourceUrl: awardUrl,
    },
    {
      requirement: "Your ability to supply the required authorization",
      status: "needs review",
      sourceUrl: null,
    },
  ],
  questions: [
    "For a future procedure: is the requirement equipment purchase, maintenance, or a bundled service?",
    "Does the manufacturer support the proposed service territory and models?",
  ],
};
const historicalProcedure: TenderOpportunity = {
  id: "example-endoscopy-history",
  kind: "tender",
  name: "Endoscopy service — historical procurement example",
  institution: "IMSS · UMAE Hospital de Especialidades, Puebla",
  purchasingUnit: null,
  location: "Puebla · historical context",
  procedureId: "LA-50-GYR-050GYR046-N-10-2026",
  procedureType: "public_tender",
  status: "unknown",
  scope: "bundled",
  partida: null,
  deadline: null,
  deadlineSource: null,
  amendmentsChecked: false,
  products: ["Endoscopy-related products"],
  hypothesis:
    "Procedure-heavy products can still be bought through institutional procurement. A bundled endoscopy service is not equivalent to a stand-alone consumables purchase.",
  evidence: [
    fact(
      "p1",
      "The official clarification record concerns an integrated minimally invasive digestive endoscopy service for the IMSS specialty hospital in Puebla for 2026.",
      procedureUrl,
      "IMSS clarification record",
    ),
  ],
  gaps: [
    "Historical example; current participation is not verified.",
    "The full service scope, eligibility, and product compatibility need separate review.",
  ],
  nextStep:
    "Identify the current buying procedure and whether the supplier can deliver the complete required service.",
  checkedAt: CHECKED,
  historical: true,
  checklist: [
    {
      requirement:
        "Ability to meet the complete integrated-service specification",
      status: "needs review",
      sourceUrl: procedureUrl,
    },
  ],
  questions: [
    "Is a partial product offer permitted for the relevant partida?",
    "What equipment, consumables, training and support are bundled into the service?",
  ],
};
const physicians: PhysicianLead[] = [
  {
    name: "Dr. Jorge Alberto Pérez Samperio",
    url: physicianUrl,
    claim:
      "The hospital profile lists general surgery, minimally invasive surgery, and an affiliation with Hospital Angeles México.",
  },
  {
    name: "Dr. Mauricio Rodríguez González",
    url: secondUrl,
    claim:
      "The hospital profile lists general surgery and advanced laparoscopic surgery, with an affiliation with Hospital Angeles México.",
  },
].map((p, i) => ({
  id: "example-physician-" + i,
  kind: "physician",
  name: p.name,
  location: "Ciudad de México",
  specialty: "General surgery",
  affiliation: "Hospital Angeles México",
  sector: "private",
  credentials: "unverified",
  products: ["Laparoscopic instruments", "Procedure-specific supplies"],
  hypothesis:
    "The documented surgical activity supports a conversation about procedure-specific products. It does not prove product preference, case volume, or purchasing authority.",
  evidence: [
    fact("physician-" + i, p.claim, p.url, "Official Hospital Angeles profile"),
  ],
  gaps: [
    "Named purchasing contact and buying authority are unverified.",
    "Current product preferences and compatibility are unknown.",
    "Contact details and current credentials must be checked before outreach.",
  ],
  nextStep:
    "Ask the hospital’s professional contact channel for the appropriate route for a product discussion, then confirm purchasing requirements.",
  checkedAt: CHECKED,
  historical: false,
  contacts: [
    {
      role: "clinical advocate",
      name: p.name,
      channel: null,
      sourceUrl: p.url,
      verified: false,
    },
    {
      role: "purchasing contact",
      name: null,
      channel: null,
      sourceUrl: null,
      verified: false,
    },
  ],
  outreach:
    "Buen día. Consulté el perfil de " +
    p.name +
    " en el directorio de Hospital Angeles México y su actividad en cirugía general. Estamos explorando la posible relevancia de instrumental laparoscópico para su práctica. ¿Podrían indicarnos el canal adecuado para una breve conversación técnica y, en su caso, el proceso de evaluación y compras del hospital? Antes de proponer un producto confirmaríamos indicaciones, compatibilidad y documentación. Gracias.",
}));
const hospital: Opportunity = {
  id: "example-hospital",
  kind: "institution",
  name: "CHRISTUS MUGUERZA · Hospital Alta Especialidad",
  institutionType: "Hospital",
  location: "Monterrey, Nuevo León",
  sector: "private",
  denueId: null,
  products: ["Hospital patient monitoring"],
  hypothesis:
    "A hospital listing emergency medical services is a plausible account for a monitoring conversation. An active equipment need, installed systems, and budget have not been established.",
  evidence: [
    fact(
      "h1",
      "The official hospital page lists an address in Monterrey and emergency medical services.",
      hospitalUrl,
      "Official hospital page",
    ),
    fact(
      "h2",
      "The official page publishes a general telephone number: 81 8399 3477. This is not a verified purchasing extension.",
      hospitalUrl,
      "Official hospital contact",
    ),
  ],
  gaps: [
    "Purchasing and biomedical engineering contacts are unverified.",
    "No current procurement project or buying intent has been established.",
    "Compatibility, service coverage and supplier approval need confirmation.",
  ],
  nextStep:
    "Use the official general contact channel to ask for supplier registration and the relevant purchasing or biomedical engineering team.",
  checkedAt: CHECKED,
  historical: false,
  contacts: [
    {
      role: "purchasing contact",
      name: null,
      channel:
        "General switchboard: 81 8399 3477 — ask for the appropriate department",
      sourceUrl: hospitalUrl,
      verified: false,
    },
    {
      role: "technical evaluator",
      name: null,
      channel: null,
      sourceUrl: null,
      verified: false,
    },
  ],
  outreach:
    "Buen día. Distribuimos soluciones de monitoreo de pacientes y nos gustaría conocer el proceso de registro y evaluación de proveedores del hospital. ¿Podrían orientarnos con el área de compras o ingeniería biomédica? Antes de presentar una propuesta confirmaríamos los requisitos técnicos, compatibilidad y soporte local. Gracias.",
};
export function exampleRun(
  name: "monitoring" | "procedures",
  route?: Route,
): ResearchRun {
  const selected = route ?? (name === "monitoring" ? "tenders" : "physicians");
  const readiness = {
    ...initialReadiness,
    territory:
      name === "monitoring" ? "Monterrey, Nuevo León" : "Ciudad de México",
  };
  const all: Opportunity[] =
    name === "monitoring"
      ? [historicalMonitor, hospital]
      : [...physicians, historicalProcedure];
  return {
    id: "example-" + name,
    status: "complete",
    stage: "Manually reviewed example",
    input: {
      text: sampleCatalogs[name],
      families: analyzeCatalog(sampleCatalogs[name], readiness),
      route: selected,
      readiness,
    },
    results: structuredClone(
      all.filter((x) =>
        selected === "tenders"
          ? x.kind === "tender"
          : selected === "physicians"
            ? x.kind === "physician"
            : x.kind === "institution",
      ),
    ),
    limitations: [
      "Saved, manually reviewed example dated 24 September 2026. This was not generated by a live API run.",
      "The supplier and catalog are fictional; referenced organizations and professionals are real. No buying intent is claimed.",
      ...(selected === "tenders"
        ? [
            "Historical records demonstrate qualification caveats. They are not currently actionable leads.",
          ]
        : []),
    ],
    createdAt: CHECKED,
    updatedAt: CHECKED,
    costUsd: 0,
    durationMs: null,
    sample: true,
  };
}
