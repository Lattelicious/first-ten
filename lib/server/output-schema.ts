import { zodToJsonSchema } from "zod-to-json-schema";
import { researchOutput } from "./schemas";

export function researchJsonSchema() {
  const schema = zodToJsonSchema(researchOutput, {
    $refStrategy: "none",
    target: "openAi",
  });
  delete (schema as Record<string, unknown>).$schema;
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    // OpenAI strict output supports patterns, but not JSON Schema's URI format.
    // Runtime Zod parsing and source validation still check every resulting URL.
    if (node.format === "uri") {
      delete node.format;
      node.pattern = "^https://";
    }
    Object.values(node).forEach(visit);
  };
  visit(schema);
  return schema;
}
