"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  Landmark,
  Download,
  Copy,
  CheckCircle2,
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetHeader,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { Opportunity, ResearchRun } from "@/lib/types";
import { routeLabels } from "@/lib/types";
import { actionableTender } from "@/lib/validation";
function statusLabel(item: Opportunity) {
  if (item.historical) return "Historical context";
  if (item.kind === "tender")
    return actionableTender(item)
      ? "Open · verify eligibility"
      : item.status.replaceAll("_", " ");
  return "Potential fit · authority unverified";
}
export default function Results({
  run,
  cancel,
  resume,
}: {
  run: ResearchRun;
  cancel: () => void;
  resume: () => void;
}) {
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    setDraft(selected && selected.kind !== "tender" ? selected.outreach : "");
  }, [selected]);
  const active = ["queued", "researching", "verifying"].includes(run.status);
  const count = run.results.filter((x) => !x.historical).length;
  return (
    <section className="results-section" aria-label="Research results">
      <div className="results-heading">
        <div>
          <p className="eyebrow">
            {run.sample ? "Reviewed example" : "Research results"}
          </p>
          <h2>
            {routeLabels[run.input.route]}{" "}
            <span className="count-badge">{count}</span>
          </h2>
          <p className="result-market">
            <span>{run.input.readiness.territory}</span>
            <span>
              {run.sample
                ? "Reviewed 24 Sep 2026"
                : new Date(run.createdAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
            </span>
          </p>
        </div>
        {run.results.length ? (
          <Button variant="outline" asChild>
            <a
              href={
                run.sample
                  ? "/api/examples/" +
                    run.id.replace("example-", "") +
                    "/export?route=" +
                    run.input.route
                  : "/api/runs/" + run.id + "/export"
              }
              download
            >
              <Download size={15} />
              Export CSV
            </a>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            <Download size={15} />
            Export CSV
          </Button>
        )}
      </div>
      {run.sample && (
        <div className="sample-banner">
          <BookLabel /> Fictional supplier · Real sources · Manually reviewed
          example. No current buying intent is claimed.
        </div>
      )}
      {active && (
        <div className="research-progress" role="status">
          <div>
            <strong>{run.stage}</strong>
            <span>
              Research can take a few minutes. You can return to this saved run.
            </span>
          </div>
          <Progress
            value={
              run.status === "queued"
                ? 8
                : run.status === "researching"
                  ? 35
                  : 75
            }
          />
          <div className="button-row">
            <Button variant="outline" onClick={resume}>
              Resume / check progress
            </Button>
            <Button variant="ghost" onClick={cancel}>
              Cancel research
            </Button>
          </div>
        </div>
      )}
      {run.error && (
        <div className="error-message" role="alert">
          {run.error}
        </div>
      )}
      {!active && !run.results.length && (
        <div className="empty-results">
          <HelpCircle size={25} />
          <h3>No supported opportunities in this view</h3>
          <p>
            {run.sample
              ? "Choose another route or example to explore its reviewed results."
              : "The research could not establish enough evidence. Try a clearer product description or a broader territory."}
          </p>
        </div>
      )}
      <div className="opportunity-list">
        {run.results.map((item, i) => {
          return (
            <button
              className="opportunity-row"
              key={item.id}
              onClick={() => setSelected(item)}
            >
              <span className="result-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="result-main">
                <span className="result-type">
                  {item.kind === "tender"
                    ? item.scope
                    : item.kind === "physician"
                      ? item.specialty
                      : item.institutionType}
                </span>
                <strong>{item.name}</strong>
                <span>{item.location}</span>
                <span className="result-hypothesis">{item.hypothesis}</span>
                <span className="source-count">
                  {item.evidence.length} sourced fact
                  {item.evidence.length !== 1 ? "s" : ""} · {item.gaps.length}{" "}
                  things to verify
                </span>
              </span>
              <span
                className={
                  "status-pill " + (item.historical ? "historical" : "")
                }
              >
                {statusLabel(item)}
              </span>
              <ChevronRight size={19} className="row-chevron" />
            </button>
          );
        })}
      </div>
      <div className="research-notes">
        <strong>Coverage & limitations</strong>
        <ul>
          {run.limitations.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
        {!run.sample && (
          <p>
            Estimated AI cost: ${run.costUsd.toFixed(4)}
            {run.durationMs !== null
              ? " · Elapsed: " + Math.round(run.durationMs / 1000) + " seconds"
              : ""}
            . An uncertain provider request may retain a conservative budget
            charge.
          </p>
        )}
      </div>
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="detail-sheet">
          <SheetHeader>
            <p className="eyebrow">Opportunity brief</p>
            <SheetTitle className="detail-title">{selected?.name}</SheetTitle>
            <SheetDescription>
              {selected?.location} · {selected ? statusLabel(selected) : ""}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="detail-body">
              <section className="detail-section">
                <h3>
                  <CheckCircle2 size={18} /> Sourced facts
                </h3>
                {selected.evidence.map((e) => (
                  <article className="fact" key={e.id}>
                    <p>{e.claim}</p>
                    <a href={e.url} target="_blank" rel="noreferrer">
                      {e.title}
                      <ArrowUpRight size={14} />
                    </a>
                    <small>
                      Checked{" "}
                      {new Date(e.retrievedAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                      {e.publishedAt ? " · Published " + e.publishedAt : ""}
                    </small>
                  </article>
                ))}
              </section>
              <section className="fit-section">
                <span className="eyebrow">Commercial hypothesis</span>
                <p>{selected.hypothesis}</p>
                <div className="tag-row">
                  {selected.products.map((p) => (
                    <span key={p}>{p}</span>
                  ))}
                </div>
              </section>
              {selected.kind === "tender" ? (
                <section className="detail-section">
                  <h3>
                    <Landmark size={18} /> Procurement details
                  </h3>
                  <dl className="detail-grid">
                    <dt>Procedure</dt>
                    <dd>{selected.procedureId}</dd>
                    <dt>Buying unit</dt>
                    <dd>{selected.purchasingUnit ?? "Not verified"}</dd>
                    <dt>Partida</dt>
                    <dd>{selected.partida ?? "Not verified"}</dd>
                    <dt>Scope</dt>
                    <dd>{selected.scope}</dd>
                    <dt>Submission deadline</dt>
                    <dd>{selected.deadline ?? "Not verified"}</dd>
                    <dt>Amendments</dt>
                    <dd>
                      {selected.amendmentsChecked
                        ? "Checked against sources"
                        : "Needs review"}
                    </dd>
                  </dl>
                  <p className="caveat">
                    Product fit does not establish eligibility. A supported item
                    below means the requirement is documented—not that your
                    business meets it.
                  </p>
                  {selected.checklist.map((c, i) => (
                    <div className="checklist-row" key={i}>
                      <span>
                        {c.requirement}
                        {c.sourceUrl && (
                          <a
                            href={c.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={"Source for " + c.requirement}
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </span>
                      <span className="small-status">{c.status}</span>
                    </div>
                  ))}
                  <h4>Questions for a formal clarification</h4>
                  <ul>
                    {selected.questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </section>
              ) : (
                <section className="detail-section">
                  <h3>
                    <Building2 size={18} /> The buying conversation
                  </h3>
                  {selected.kind === "physician" && (
                    <p className="caveat">
                      Listed affiliation: {selected.affiliation ?? "Unknown"}.
                      Credentials: unverified.
                    </p>
                  )}
                  {selected.contacts.map((c, i) => (
                    <div className="contact-row" key={i}>
                      <span className="eyebrow">{c.role}</span>
                      <strong>{c.name ?? "Named contact not verified"}</strong>
                      <p>
                        {c.channel ??
                          "Professional contact channel needs verification."}
                      </p>
                      <small>
                        {c.verified
                          ? "Source-backed contact; confirm authority before outreach."
                          : "Suggested role; purchasing authority not established."}
                      </small>
                    </div>
                  ))}
                  {selected.kind === "physician" && (
                    <div className="verification-links">
                      <a
                        href="https://www.conacem.org.mx/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        CONACEM verification <ArrowUpRight size={13} />
                      </a>
                      <a
                        href="https://sep.puebla.gob.mx/index.php/estudiantes/educacion-superior/registro-nacional-de-profesionistas"
                        target="_blank"
                        rel="noreferrer"
                      >
                        SEP registry <ArrowUpRight size={13} />
                      </a>
                      <a
                        href="https://www.doctoralia.com.mx/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Doctoralia · external reference{" "}
                        <ArrowUpRight size={13} />
                      </a>
                    </div>
                  )}
                  <p className="caveat">
                    Direct commercial contact is not the public procurement
                    procedure “adjudicación directa.” Public institutions may
                    still require a formal process.
                  </p>
                </section>
              )}
              <section className="detail-section">
                <h3>
                  <HelpCircle size={18} /> What still needs checking
                </h3>
                <ul>
                  {selected.gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
                <div className="next-step">
                  <strong>Suggested next step</strong>
                  <p>{selected.nextStep}</p>
                </div>
              </section>
              {selected.kind !== "tender" && (
                <section className="detail-section">
                  <h3>Spanish outreach draft</h3>
                  <p className="caveat">
                    Review and personalize before using. First Ten does not send
                    messages.
                  </p>
                  <Textarea
                    aria-label="Editable Spanish outreach draft"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="outreach-text"
                  />
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(draft);
                        toast.success("Draft copied.");
                      } catch {
                        toast.error("Select the draft and copy it manually.");
                      }
                    }}
                  >
                    <Copy size={15} /> Copy draft
                  </Button>
                </section>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
function BookLabel() {
  return <span className="sample-label">EXAMPLE</span>;
}
