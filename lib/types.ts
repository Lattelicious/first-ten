export type Route = "tenders" | "physicians" | "institutions";
export type Readiness = {
  territory: string;
  publicSector: "yes" | "no" | "unknown";
  authorization: "yes" | "no" | "unknown";
  regulatory: "yes" | "no" | "unknown";
  service: "yes" | "no" | "unknown";
};
export type ProductFamily = {
  id: string;
  name: string;
  description: string;
  specialties: string[];
  requirements: string[];
  primary: Route;
  secondary: Route;
  rationale: string;
  caveat: string;
  unknowns: string[];
};
export type Evidence = {
  id: string;
  claim: string;
  url: string;
  title: string;
  publishedAt: string | null;
  retrievedAt: string;
};
export type Contact = {
  role: "clinical advocate" | "technical evaluator" | "purchasing contact";
  name: string | null;
  channel: string | null;
  sourceUrl: string | null;
  verified: boolean;
};
export type BaseOpportunity = {
  id: string;
  name: string;
  location: string;
  products: string[];
  hypothesis: string;
  evidence: Evidence[];
  gaps: string[];
  nextStep: string;
  checkedAt: string;
  historical: boolean;
};
export type TenderOpportunity = BaseOpportunity & {
  kind: "tender";
  institution: string;
  purchasingUnit: string | null;
  procedureId: string;
  procedureType: "public_tender" | "invitation" | "direct_award" | "unknown";
  status:
    | "open"
    | "invitation_only"
    | "preliminary"
    | "awarded"
    | "closed"
    | "cancelled"
    | "unknown";
  scope:
    | "purchase"
    | "maintenance"
    | "rental"
    | "consumables"
    | "bundled"
    | "unknown";
  partida: string | null;
  deadline: string | null;
  deadlineSource: string | null;
  amendmentsChecked: boolean;
  checklist: {
    requirement: string;
    status: "supported" | "missing" | "needs review";
    sourceUrl: string | null;
  }[];
  questions: string[];
};
export type PhysicianLead = BaseOpportunity & {
  kind: "physician";
  specialty: string;
  affiliation: string | null;
  sector: "private" | "public" | "independent" | "unknown";
  credentials: "unverified" | "verified";
  contacts: Contact[];
  outreach: string;
};
export type InstitutionLead = BaseOpportunity & {
  kind: "institution";
  institutionType: string;
  sector: "private" | "public" | "independent" | "unknown";
  denueId: string | null;
  contacts: Contact[];
  outreach: string;
};
export type Opportunity = TenderOpportunity | PhysicianLead | InstitutionLead;
export type RunInput = {
  text: string;
  catalogId?: string;
  families: ProductFamily[];
  route: Route;
  readiness: Readiness;
};
export type ResearchRun = {
  id: string;
  status:
    | "queued"
    | "researching"
    | "verifying"
    | "complete"
    | "failed"
    | "cancelled";
  stage: string;
  input: RunInput;
  results: Opportunity[];
  limitations: string[];
  createdAt: string;
  updatedAt: string;
  costUsd: number;
  durationMs: number | null;
  error?: string | null;
  sample?: boolean;
};
export const routeLabels: Record<Route, string> = {
  tenders: "Licitaciones",
  physicians: "Médicos",
  institutions: "Hospitales y clínicas",
};
export const initialReadiness: Readiness = {
  territory: "Monterrey, Nuevo León",
  publicSector: "unknown",
  authorization: "unknown",
  regulatory: "unknown",
  service: "unknown",
};
