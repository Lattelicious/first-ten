"use client";
import { flushSync } from "react-dom";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Building2,
  Upload,
  Check,
  BookOpen,
  ChevronDown,
  History,
  Trash2,
  LoaderCircle,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetHeader,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Toaster, toast } from "sonner";
import { analyzeCatalog } from "@/lib/catalog";
import {
  initialReadiness,
  routeLabels,
  type ProductFamily,
  type Route,
  type Readiness,
  type ResearchRun,
} from "@/lib/types";
import { exampleRun, sampleCatalogs } from "@/lib/examples";
import Results from "./results";

type Session = {
  user: { name: string; id: string; owner: boolean } | null;
  live: boolean;
  denue: boolean;
};
async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api/" + path, {
    method,
    headers:
      body instanceof FormData
        ? {}
        : body
          ? { "Content-Type": "application/json" }
          : {},
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(data.error ?? "This operation could not be completed.");
  return data;
}
const isActive = (r: ResearchRun | null) =>
  !!r && ["queued", "researching", "verifying"].includes(r.status);
export default function Workspace({
  user,
  signInUrl,
}: {
  user: { name: string } | null;
  signInUrl: string;
}) {
  const [text, setText] = useState(""),
    [readiness, setReadiness] = useState<Readiness>(initialReadiness),
    [families, setFamilies] = useState<ProductFamily[]>([]),
    [route, setRoute] = useState<Route>("tenders");
  const [session, setSession] = useState<Session | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [showReadiness, setShowReadiness] = useState(false),
    [catalog, setCatalog] = useState<{ id: string; name: string } | null>(null);
  const [run, setRun] = useState<ResearchRun | null>(null),
    [polling, setPolling] = useState(true),
    [example, setExample] = useState<"monitoring" | "procedures" | null>(null),
    [drawer, setDrawer] = useState<"saved" | "sources" | "admin" | null>(null);
  const [history, setHistory] = useState<ResearchRun[]>([]),
    [uploads, setUploads] = useState<
      { id: string; name: string; created_at: string }[]
    >([]),
    [deleteTarget, setDeleteTarget] = useState<{
      type: "runs" | "catalogs";
      id: string;
    } | null>(null),
    [admin, setAdmin] = useState<{
      budgets: Record<string, number | string>[];
      datasets: Record<string, number | string>[];
    } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const displayUser = session?.user ?? user;
  useEffect(() => {
    api<Session>("session")
      .then(setSession)
      .catch(() => {});
    try {
      const saved = sessionStorage.getItem("first-ten-draft");
      if (saved) {
        const draft = JSON.parse(saved);
        if (typeof draft.text === "string") setText(draft.text.slice(0, 20000));
        if (typeof draft.territory === "string")
          setReadiness((r) => ({
            ...r,
            territory: draft.territory.slice(0, 120),
          }));
        sessionStorage.removeItem("first-ten-draft");
      }
    } catch {}
    const id = new URL(window.location.href).searchParams.get("run");
    if (id && /^[a-z0-9-]+$/i.test(id))
      api<ResearchRun>("runs/" + id)
        .then(setRun)
        .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!run || run.sample || !isActive(run) || !polling) return;
    let stopped = false;
    const timer = setTimeout(async () => {
      try {
        const next = await api<ResearchRun>(
          "runs/" + run.id + "/advance",
          "POST",
        );
        if (!stopped) setRun(next);
      } catch (e) {
        if (!stopped) {
          setError((e as Error).message);
          setPolling(false);
        }
      }
    }, 2500);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [run, polling]);
  function editText(value: string) {
    setText(value);
    setFamilies([]);
    setCatalog(null);
    setExample(null);
    setError("");
  }
  function setMarket(value: string) {
    setReadiness((r) => ({ ...r, territory: value }));
    setFamilies([]);
    setExample(null);
  }
  function review() {
    if (text.trim().length < 10) {
      setError("Describe your products in at least 10 characters.");
      return;
    }
    const next = analyzeCatalog(text, readiness);
    setFamilies(next);
    setRoute(next[0].primary);
    setError("");
    setExample(null);
  }
  const loadExample = useCallback(
    (name: "monitoring" | "procedures", selected?: Route) => {
      const next = exampleRun(name, selected);
      setText(next.input.text);
      setReadiness(next.input.readiness);
      setFamilies(next.input.families);
      setRoute(next.input.route);
      setRun(next);
      setExample(name);
      setCatalog(null);
      setError("");
      window.history.replaceState(null, "", window.location.pathname);
    },
    [],
  );
  function chooseRoute(selected: Route) {
    setRoute(selected);
    if (example) setRun(exampleRun(example, selected));
  }
  function stageSample(name: "monitoring" | "procedures") {
    loadExample(name);
    setTimeout(
      () =>
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      80,
    );
  }
  function saveDraft() {
    try {
      sessionStorage.setItem(
        "first-ten-draft",
        JSON.stringify({ text, territory: readiness.territory }),
      );
    } catch {}
  }
  async function upload(file?: File) {
    if (!file) return;
    if (!displayUser) {
      setError(
        "Sign in before uploading a private catalog. You can paste products or explore examples without signing in.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const result = await api<{ id: string; name: string; text: string }>(
        "uploads",
        "POST",
        form,
      );
      setCatalog({ id: result.id, name: result.name });
      setText(result.text);
      setFamilies([]);
      setExample(null);
      toast.success("Catalog loaded. Review the extracted products.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  async function start() {
    setError("");
    setBusy(true);
    try {
      const next = await api<ResearchRun>("runs", "POST", {
        text,
        catalogId: catalog?.id,
        families,
        route,
        readiness,
      });
      setRun(next);
      setExample(null);
      setPolling(true);
      window.history.replaceState(null, "", "?run=" + next.id);
      setTimeout(
        () => resultsRef.current?.scrollIntoView({ behavior: "smooth" }),
        80,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!run || run.sample) return;
    try {
      setRun(await api<ResearchRun>("runs/" + run.id + "/cancel", "POST"));
      toast.success("Research cancelled.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function saved() {
    setDrawer("saved");
    try {
      const [r, c] = await Promise.all([
        api<{ runs: ResearchRun[] }>("runs"),
        api<{ results: { id: string; name: string; created_at: string }[] }>(
          "catalogs",
        ),
      ]);
      setHistory(r.runs);
      setUploads(c.results ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function remove() {
    if (!deleteTarget) return;
    try {
      await api(deleteTarget.type + "/" + deleteTarget.id, "DELETE");
      if (
        run?.id === deleteTarget.id ||
        (deleteTarget.type === "catalogs" &&
          run?.input.catalogId === deleteTarget.id)
      ) {
        setRun(null);
        window.history.replaceState(null, "", window.location.pathname);
      }
      if (catalog?.id === deleteTarget.id) {
        setCatalog(null);
        setText("");
        setFamilies([]);
      }
      setHistory((h) =>
        h.filter((r) =>
          deleteTarget.type === "runs"
            ? r.id !== deleteTarget.id
            : r.input.catalogId !== deleteTarget.id,
        ),
      );
      setUploads((c) => c.filter((x) => x.id !== deleteTarget.id));
      toast.success("Deleted.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleteTarget(null);
    }
  }
  async function openAdmin() {
    setDrawer("admin");
    try {
      setAdmin(await api<NonNullable<typeof admin>>("admin/status"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function importCache(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await api("admin/datasets", "POST", new FormData(event.currentTarget));
      setAdmin(await api<NonNullable<typeof admin>>("admin/status"));
      toast.success("Official dataset imported.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const actions = useRef({
    read: () => ({}),
    open: (name: "monitoring" | "procedures", selected?: Route) => {},
    configure: (input: { text: string; territory: string; route: Route }) => {},
  });
  useEffect(() => {
    actions.current = {
      read: () => ({
        mode: route,
        productFamilies: families.map((f) => ({
          name: f.name,
          primary: f.primary,
          secondary: f.secondary,
        })),
        run: run
          ? { id: run.id, status: run.status, results: run.results }
          : null,
      }),
      open: loadExample,
      configure: (input) => {
        setText(input.text);
        const ready = { ...readiness, territory: input.territory };
        setReadiness(ready);
        setFamilies(analyzeCatalog(input.text, ready));
        setRoute(input.route);
        setExample(null);
      },
    };
  }, [route, families, run, loadExample, readiness]);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    const add = (tool: unknown) => {
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    };
    add({
      name: "read_first_ten_workspace",
      description:
        "Read the current First Ten route, product families, and visible research results.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async () => actions.current.read(),
    });
    add({
      name: "open_first_ten_example",
      description:
        "Open a manually reviewed example. Does not start paid research.",
      inputSchema: {
        type: "object",
        properties: {
          example: { type: "string", enum: ["monitoring", "procedures"] },
        },
        required: ["example"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input: { example: string }) => {
        if (!["monitoring", "procedures"].includes(input.example))
          throw new Error("Unknown example");
        flushSync(() =>
          actions.current.open(input.example as "monitoring" | "procedures"),
        );
        return { opened: input.example };
      },
    });
    add({
      name: "configure_first_ten_research",
      description:
        "Stage catalog text, territory and sales route in the form. Does not start research or upload data.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", minLength: 10, maxLength: 20000 },
          territory: { type: "string", minLength: 2, maxLength: 120 },
          route: {
            type: "string",
            enum: ["tenders", "physicians", "institutions"],
          },
        },
        required: ["text", "territory", "route"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input: {
        text: string;
        territory: string;
        route: Route;
      }) => {
        if (
          typeof input.text !== "string" ||
          input.text.length < 10 ||
          input.text.length > 20000 ||
          typeof input.territory !== "string" ||
          input.territory.length < 2 ||
          input.territory.length > 120 ||
          !["tenders", "physicians", "institutions"].includes(input.route)
        )
          throw new Error("Invalid research configuration");
        flushSync(() => actions.current.configure(input));
        return { staged: true, paidResearchStarted: false };
      },
    });
    return () => lifecycle.abort();
  }, []);
  return (
    <div className="app-shell">
      <Toaster richColors position="bottom-right" />
      <header className="topbar">
        <a href="/" className="brand">
          First Ten<span className="brand-sub">Mexico</span>
        </a>
        <div className="top-actions">
          <button
            aria-label="Sources and method"
            onClick={() => setDrawer("sources")}
            className="quiet-button"
          >
            <BookOpen size={16} />
            <span>Sources & method</span>
          </button>
          {displayUser ? (
            <>
              <button
                aria-label="Saved research"
                className="quiet-button"
                onClick={saved}
              >
                <History size={16} />
                <span>Saved research</span>
              </button>
              <a
                className="signin"
                href="/signout-with-chatgpt?return_to=%2F"
                target="_top"
              >
                Sign out
              </a>
            </>
          ) : (
            <a
              className="signin"
              href={signInUrl}
              onClick={saveDraft}
              target="_top"
            >
              Sign in with ChatGPT
              <ArrowUpRight size={15} />
            </a>
          )}
        </div>
      </header>
      <main className="main-content">
        <div className="page-heading">
          <div>
            <h1>Research opportunities</h1>
            <p className="intro">
              A sales approach for your medical catalog, supported by sources.
            </p>
          </div>

        </div>
        <div className="workspace-grid">
          <section className="intake panel">
            <div className="section-heading">
              <span className="step-number">01</span>
              <div>
                <h2>Your catalog</h2>
              </div>
            </div>
            <label className="field-label" htmlFor="catalog">
              Products & intended use
            </label>
            <Textarea
              id="catalog"
              className="catalog-text"
              maxLength={20000}
              placeholder="e.g. Multiparameter patient monitors for hospitals, central monitoring stations, and compatible accessories…"
              value={text}
              onChange={(e) => editText(e.target.value)}
            />
            <input
              ref={fileRef}
              id="catalog-file"
              type="file"
              accept=".csv,.pdf"
              className="sr-only"
              onChange={(e) => upload(e.target.files?.[0])}
            />
            <button
              className="upload-control"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={15} />
              {busy
                ? "Reading catalog…"
                : catalog
                  ? catalog.name
                  : "Upload catalog"}
              <span>PDF / CSV · 10 MB · 20 pages</span>
            </button>
            <div className="example-links">
              <span>Try a sample</span>
              <button onClick={() => stageSample("monitoring")}>
                Patient monitoring <ArrowUpRight size={13} />
              </button>
              <button onClick={() => stageSample("procedures")}>
                Procedure supplies <ArrowUpRight size={13} />
              </button>
            </div>
            <label className="field-label" htmlFor="territory">
              Target market
            </label>
            <div className="input-with-icon">
              <MapPin size={17} />
              <Input
                id="territory"
                maxLength={120}
                value={readiness.territory}
                onChange={(e) => setMarket(e.target.value)}
              />
            </div>
            <button
              className="readiness-toggle"
              aria-expanded={showReadiness}
              onClick={() => setShowReadiness((s) => !s)}
            >
              <SlidersHorizontal size={15} /> Supplier readiness{" "}
              <span>Optional</span>
              <ChevronDown size={15} />
            </button>
            {showReadiness && (
              <div className="readiness-fields">
                {(
                  [
                    {
                      key: "publicSector",
                      label: "Interested in public-sector sales?",
                    },
                    {
                      key: "authorization",
                      label: "Manufacturer authorization confirmed?",
                    },
                    {
                      key: "regulatory",
                      label: "Applicable product documentation ready?",
                    },
                    {
                      key: "service",
                      label: "Local installation and service available?",
                    },
                  ] as const
                ).map((q) => (
                  <div key={q.key}>
                    <label className="field-label" htmlFor={q.key}>
                      {q.label}
                    </label>
                    <Select
                      value={readiness[q.key]}
                      onValueChange={(v) => {
                        setReadiness((r) => ({ ...r, [q.key]: v }));
                        setFamilies([]);
                        setExample(null);
                      }}
                    >
                      <SelectTrigger id={q.key}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">Not confirmed</SelectItem>
                        <SelectItem value="yes">Yes — self-reported</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <p className="caveat">
                  These answers guide research. They do not verify tender
                  eligibility or product compliance.
                </p>
              </div>
            )}
            <Button
              className="primary-action"
              disabled={
                busy ||
                text.trim().length < 10 ||
                readiness.territory.length < 2
              }
              onClick={review}
            >
              Review catalog <ArrowRight size={17} />
            </Button>
            <p className="privacy-note">
              Your uploads and research stay private. Live research sends your
              selected product information to OpenAI.
            </p>
          </section>
          <section className="route-workspace">
            <div className="section-heading">
              <span className="step-number">02</span>
              <div>
                <h2>Sales approach</h2>
              </div>
            </div>
            {families.length > 0 ? (
              <>
                <div className="recommendation">
                  <div>
                    <span className="eyebrow">
                      {families.length > 1
                        ? "Recommendation by product family"
                        : "Recommended approach"}
                    </span>
                    <h3>
                      {families.length > 1
                        ? "Routes by product family"
                        : routeLabels[families[0].primary]}
                    </h3>
                    {families.length > 1 ? (
                      families.map((f) => (
                        <p key={f.id}>
                          <strong>{f.name}</strong>: {routeLabels[f.primary]} ·
                          complementary {routeLabels[f.secondary]}
                        </p>
                      ))
                    ) : (
                      <>
                        <p>{families[0].rationale}</p>
                        <p className="complementary">
                          Complementary route:{" "}
                          <strong>{routeLabels[families[0].secondary]}</strong>
                        </p>
                        <small>{families[0].caveat}</small>
                      </>
                    )}
                  </div>
                </div>
                <details className="family-review">
                  <summary>
                    Review {families.length} product{" "}
                    {families.length === 1 ? "family" : "families"} & edit
                    recommendations
                  </summary>
                  {families.map((f, i) => (
                    <div key={f.id} className="family-item">
                      <label className="field-label" htmlFor={"family-" + f.id}>
                        {f.name}
                      </label>
                      <Textarea
                        id={"family-" + f.id}
                        value={f.description}
                        maxLength={4000}
                        onChange={(e) =>
                          setFamilies((all) =>
                            all.map((x, n) =>
                              n === i
                                ? { ...x, description: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <p className="caveat">
                        Intended specialty:{" "}
                        {f.specialties.join(", ") || "Needs review"} · Service
                        needs: {f.requirements.join("; ")}
                      </p>
                      <div className="family-routes">
                        {(["primary", "secondary"] as const).map((key) => (
                          <div key={key}>
                            <label
                              className="field-label"
                              htmlFor={f.id + "-" + key}
                            >
                              {key === "primary"
                                ? "Primary route"
                                : "Complementary route"}
                            </label>
                            <Select
                              value={f[key]}
                              onValueChange={(v) =>
                                setFamilies((all) =>
                                  all.map((x, n) =>
                                    n === i ? { ...x, [key]: v } : x,
                                  ),
                                )
                              }
                            >
                              <SelectTrigger id={f.id + "-" + key}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(routeLabels).map(
                                  ([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                      <p className="caveat">{f.caveat}</p>
                      {f.unknowns.map((g) => (
                        <p className="gap-line" key={g}>
                          ? {g}
                        </p>
                      ))}
                    </div>
                  ))}
                </details>
              </>
            ) : (
              <div className="recommendation muted">
                <div>
                  <h3>Start with a catalog review</h3>
                  <p>
                    Add your products to get a recommended sales approach.
                    You can choose either route below.
                  </p>
                </div>
              </div>
            )}
            <RadioGroup
              value={route === "tenders" ? "tenders" : "direct"}
              onValueChange={(v) =>
                chooseRoute(
                  v === "tenders"
                    ? "tenders"
                    : families.some(
                          (f) =>
                            f.primary === "institutions" ||
                            f.secondary === "institutions",
                        ) && families[0]?.primary !== "physicians"
                      ? "institutions"
                      : "physicians",
                )
              }
              className="mode-options"
              aria-label="Sales mode"
            >
              <label
                className={
                  "mode-option " + (route === "tenders" ? "selected" : "")
                }
              >
                <RadioGroupItem value="tenders" />
                <strong>Licitaciones</strong>
                <span>
                  Public procurement, verified deadlines, and participation
                  requirements.
                </span>
              </label>
              <label
                className={
                  "mode-option " + (route !== "tenders" ? "selected" : "")
                }
              >
                <RadioGroupItem value="direct" />
                <strong>Contacto directo</strong>
                <span>
                  Physicians, hospitals, and their purchasing contacts.
                </span>
              </label>
            </RadioGroup>
            {route !== "tenders" && (
              <RadioGroup
                value={route}
                onValueChange={(v) => chooseRoute(v as Route)}
                className="direct-options"
                aria-label="Direct contact type"
              >
                <label>
                  <RadioGroupItem value="physicians" /> Médicos
                </label>
                <label>
                  <RadioGroupItem value="institutions" /> Hospitales y clínicas
                </label>
              </RadioGroup>
            )}
            {families.length > 0 && (
              <div className="launch-area">
                {!displayUser ? (
                  <a
                    className="signin-launch"
                    href={signInUrl}
                    onClick={saveDraft}
                    target="_top"
                  >
                    Sign in to research your catalog <ArrowRight size={16} />
                  </a>
                ) : (
                  <Button
                    className="primary-action"
                    disabled={busy || isActive(run) || !session?.live}
                    onClick={start}
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <ArrowRight size={17} />
                    )}
                    Research {routeLabels[route]}
                  </Button>
                )}
                {session && !session.live && (
                  <p className="caveat">
                    Live research is paused. Both saved examples are available
                    below.
                  </p>
                )}
                <p className="privacy-note">
                  Up to 10 supported opportunities · One visitor run per day
                </p>
              </div>
            )}
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
            <p className="evidence-note">
              Physician interest does not establish purchasing authority.
              Product relevance does not establish tender eligibility.
            </p>
          </section>
        </div>
        <div ref={resultsRef}>
          {run ? (
            <Results
              run={run}
              cancel={cancel}
              resume={() => {
                setError("");
                setPolling(true);
                setRun((r) => (r ? { ...r } : null));
              }}
            />
          ) : (
            <section className="examples-strip">
              <div>
                <h2>Reviewed examples</h2>
                <p>Explore the results before running research.</p>
              </div>
              <button onClick={() => stageSample("monitoring")}>
                <span>
                  <strong>Patient monitoring</strong>
                  <small>Tenders + hospital purchasing</small>
                </span>
                <ArrowUpRight size={19} />
              </button>
              <button onClick={() => stageSample("procedures")}>
                <span>
                  <strong>Procedure supplies</strong>
                  <small>Physicians + institutional context</small>
                </span>
                <ArrowUpRight size={19} />
              </button>
            </section>
          )}
        </div>
        <footer className="footer">
          <span>First Ten · Medical distribution in Mexico</span>
          <div>
            <button onClick={() => setDrawer("sources")}>
              Sources & method
            </button>
            <a
              href="https://github.com/Lattelicious/first-ten"
              target="_blank"
              rel="noreferrer"
            >
              GitHub <ArrowUpRight size={12} />
            </a>
            {session?.user?.owner && (
              <button onClick={openAdmin}>Owner workspace</button>
            )}
          </div>
        </footer>
      </main>
      <Sheet
        open={!!drawer}
        onOpenChange={(o) => {
          if (!o) setDrawer(null);
        }}
      >
        <SheetContent
          className="detail-sheet"
          {...(drawer === "sources" ? { "aria-describedby": undefined } : {})}
        >
          <SheetHeader>
            <SheetTitle className="detail-title">
              {drawer === "saved"
                ? "Your saved workspace"
                : drawer === "admin"
                  ? "Owner workspace"
                  : "Sources & method"}
            </SheetTitle>
            {drawer !== "sources" && (
              <SheetDescription>
                {drawer === "saved"
                  ? "Only you can access these catalogs and research runs."
                  : "Usage and official dataset imports."}
              </SheetDescription>
            )}
          </SheetHeader>
          <div className="detail-body">
            {drawer === "sources" ? (
              <Sources />
            ) : drawer === "saved" ? (
              <>
                <h3>Research</h3>
                {!history.length && (
                  <p className="caveat">No saved live research yet.</p>
                )}
                {history.map((r) => (
                  <div className="saved-row" key={r.id}>
                    <button
                      onClick={() => {
                        setRun(r);
                        setText(r.input.text);
                        setFamilies(r.input.families);
                        setReadiness(r.input.readiness);
                        setRoute(r.input.route);
                        setExample(null);
                        setPolling(true);
                        setDrawer(null);
                        window.history.replaceState(null, "", "?run=" + r.id);
                      }}
                    >
                      <strong>{routeLabels[r.input.route]}</strong>
                      <span>
                        {r.input.readiness.territory} · {r.status}
                      </span>
                      <small>{new Date(r.createdAt).toLocaleString()}</small>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={"Delete research " + r.id}
                      onClick={() =>
                        setDeleteTarget({ type: "runs", id: r.id })
                      }
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                <h3 className="mt-8">Catalog uploads</h3>
                {!uploads.length && (
                  <p className="caveat">No uploaded catalogs.</p>
                )}
                {uploads.map((c) => (
                  <div className="saved-row" key={c.id}>
                    <span>{c.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={"Delete catalog " + c.name}
                      onClick={() =>
                        setDeleteTarget({ type: "catalogs", id: c.id })
                      }
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                <p className="caveat">
                  Deleting a catalog also deletes research linked to that
                  upload. Daily quotas and aggregate spending totals remain to
                  prevent quota resets.
                </p>
              </>
            ) : drawer === "admin" ? (
              <>
                <h3>Initial AI allowance</h3>
                <p className="caveat">
                  $20 visitor pool + $5 owner reserve. Costs are estimates;
                  uncertain calls retain a conservative charge.
                </p>
                {admin?.budgets.map((b) => (
                  <p key={String(b.pool)}>
                    {String(b.pool)}: $
                    {(Number(b.spent_micros) / 1e6).toFixed(2)} used · $
                    {(Number(b.reserved_micros) / 1e6).toFixed(2)} reserved
                  </p>
                ))}
                <form onSubmit={importCache} className="import-form">
                  <h3>Import official discovery records</h3>
                  <p className="caveat">
                    Use a filtered CSV with its original headers. Maximum 2 MB /
                    1,000 rows. Imports are dated context, not proof of an open
                    tender.
                  </p>
                  <label className="field-label" htmlFor="dataset-kind">
                    Dataset
                  </label>
                  <NativeSelect id="dataset-kind" name="kind">
                    <NativeSelectOption value="procurement">
                      Compras MX / official procurement
                    </NativeSelectOption>
                    <NativeSelectOption value="denue">
                      INEGI DENUE
                    </NativeSelectOption>
                  </NativeSelect>
                  <label className="field-label" htmlFor="source-url">
                    Official source URL
                  </label>
                  <Input id="source-url" name="sourceUrl" type="url" required />
                  <label className="field-label" htmlFor="dataset-date">
                    Dataset date
                  </label>
                  <Input
                    id="dataset-date"
                    name="datasetDate"
                    type="date"
                    required
                    max={new Date().toISOString().slice(0, 10)}
                  />
                  <label className="field-label" htmlFor="dataset-file">
                    CSV file
                  </label>
                  <Input
                    id="dataset-file"
                    name="file"
                    type="file"
                    accept=".csv"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={busy}
                    className="primary-action"
                  >
                    Import dataset
                  </Button>
                </form>
                {admin?.datasets.map((d) => (
                  <p className="caveat" key={String(d.id)}>
                    {String(d.title)} · {String(d.row_count)} records ·{" "}
                    {String(d.dataset_date)}
                  </p>
                ))}
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this{" "}
              {deleteTarget?.type === "catalogs"
                ? "catalog and its research"
                : "research run"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the saved content from First Ten. Active
              research will be stopped first. Aggregate usage and daily limits
              are retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
function Sources() {
  return (
    <div className="sources-content">
      <h3>How First Ten works</h3>
      <ol>
        <li>Review the catalog and an editable route recommendation.</li>
        <li>Research primary sources for the selected market and route.</li>
        <li>Check supporting evidence before publishing a result.</li>
      </ol>
      <h3>Public procurement</h3>
      <p>
        <a
          href="https://comprasmx.buengobierno.gob.mx/sitiopublico/"
          target="_blank"
          rel="noreferrer"
        >
          Compras MX
        </a>{" "}
        and{" "}
        <a
          href="https://comprasmx.buengobierno.gob.mx/datos-abiertos"
          target="_blank"
          rel="noreferrer"
        >
          official datasets
        </a>{" "}
        supply federal discovery. Current deadlines require the issuing
        institution’s documents and available amendments. The{" "}
        <a
          href="https://www.nl.gob.mx/es/licitaciones-dependencias-centrales"
          target="_blank"
          rel="noreferrer"
        >
          Nuevo León portal
        </a>{" "}
        adds initial state coverage. Coverage is not nationwide or exhaustive.
      </p>
      <h3>Hospitals and physicians</h3>
      <p>
        <a
          href="https://www.inegi.org.mx/servicios/api_denue.html"
          target="_blank"
          rel="noreferrer"
        >
          INEGI DENUE
        </a>{" "}
        identifies establishments, not named buyers. Hospital and physician
        websites supply professional facts. Credential checks use{" "}
        <a href="https://www.conacem.org.mx/" target="_blank" rel="noreferrer">
          CONACEM
        </a>{" "}
        and the SEP registry separately.
      </p>
      <p>
        <a
          href="https://www.doctoralia.com.mx/"
          target="_blank"
          rel="noreferrer"
        >
          Doctoralia
        </a>{" "}
        is an external reference only. Its profiles, reviews, ratings, and
        appointment data are not ingested.
      </p>
      <h3>Data</h3>
      <p>
        Live research sends the selected catalog information to OpenAI. Your
        uploads and runs are restricted to your signed-in account. You can
        delete them in Saved research. Model response records are requested to
        be deleted after completed stages; provider retention policies also
        apply.
      </p>
      <h3>Examples</h3>
      <p>
        Suppliers and catalogs in provided examples are fictional, referenced
        organizations and professionals are real.
      </p>
    </div>
  );
}
