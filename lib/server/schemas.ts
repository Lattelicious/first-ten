import { z } from "zod";
const s = z.string().max(3000),
  url = z.string().url().max(2000),
  nullable = s.nullable();
export const readinessSchema = z.object({
  territory: z.string().trim().min(2).max(120),
  publicSector: z.enum(["yes", "no", "unknown"]),
  authorization: z.enum(["yes", "no", "unknown"]),
  regulatory: z.enum(["yes", "no", "unknown"]),
  service: z.enum(["yes", "no", "unknown"]),
});
const route = z.enum(["tenders", "physicians", "institutions"]);
export const familySchema = z.object({
  id: z.string().max(100),
  name: z.string().min(1).max(150),
  description: z.string().max(4000),
  specialties: z.array(s).max(10),
  requirements: z.array(s).max(15),
  primary: route,
  secondary: route,
  rationale: s,
  caveat: s,
  unknowns: z.array(s).max(15),
});
export const runInputSchema = z.object({
  text: z.string().trim().min(10).max(20000),
  catalogId: z.string().uuid().optional(),
  families: z.array(familySchema).min(1).max(12),
  route,
  readiness: readinessSchema,
});
const evidence = z.object({
  id: s,
  claim: s,
  url,
  title: s,
  publishedAt: nullable,
  retrievedAt: s,
});
const base = {
  id: s,
  name: s,
  location: s,
  products: z.array(s).max(15),
  hypothesis: s,
  evidence: z.array(evidence).max(20),
  gaps: z.array(s).max(20),
  nextStep: s,
  checkedAt: s,
  historical: z.boolean(),
};
const contact = z.object({
  role: z.enum([
    "clinical advocate",
    "technical evaluator",
    "purchasing contact",
  ]),
  name: nullable,
  channel: nullable,
  sourceUrl: url.nullable(),
  verified: z.boolean(),
});
const direct = {
  sector: z.enum(["private", "public", "independent", "unknown"]),
  contacts: z.array(contact).max(6),
  outreach: s,
};
export const opportunitySchema = z.discriminatedUnion("kind", [
  z.object({
    ...base,
    kind: z.literal("tender"),
    institution: s,
    purchasingUnit: nullable,
    procedureId: s,
    procedureType: z.enum([
      "public_tender",
      "invitation",
      "direct_award",
      "unknown",
    ]),
    status: z.enum([
      "open",
      "invitation_only",
      "preliminary",
      "awarded",
      "closed",
      "cancelled",
      "unknown",
    ]),
    scope: z.enum([
      "purchase",
      "maintenance",
      "rental",
      "consumables",
      "bundled",
      "unknown",
    ]),
    partida: nullable,
    deadline: nullable,
    deadlineSource: url.nullable(),
    amendmentsChecked: z.boolean(),
    checklist: z
      .array(
        z.object({
          requirement: s,
          status: z.enum(["supported", "missing", "needs review"]),
          sourceUrl: url.nullable(),
        }),
      )
      .max(20),
    questions: z.array(s).max(10),
  }),
  z.object({
    ...base,
    ...direct,
    kind: z.literal("physician"),
    specialty: s,
    affiliation: nullable,
    credentials: z.enum(["unverified", "verified"]),
  }),
  z.object({
    ...base,
    ...direct,
    kind: z.literal("institution"),
    institutionType: s,
    denueId: nullable,
  }),
]);
export const researchOutput = z.object({
  opportunities: z.array(opportunitySchema).max(10),
  limitations: z.array(s).max(20),
});
