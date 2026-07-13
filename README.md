# WilliamsLab

**Stabilize the unknown. Ship the signal.**

WilliamsLab is a translational-research operating system that converts a scattered field of literature, hypotheses, assays, cohorts, and datasets into one mechanism-anchored engine — carrying a project from first hunch to published proof while continuously stabilizing the uncertainty in between.

It is **Machine 03** of the Williams-grade suite:

| Machine | Metaphor | Job |
|---|---|---|
| WilliamsHub | active suspension for studying | absorbs the bumps of a curriculum |
| WilliamsPod | wind tunnel / simulator for exams | runs the driver in a controlled rig |
| **WilliamsLab** | **R&D garage + telemetry center** | **designs, instruments, and stabilizes a live research program** |

The seed project is **BrS-EPI** — *Molecular Epigenetic Regulation of Sodium-Channel Genes in Brugada Syndrome*.

---

## The idea in one line

A research project loses grip the same way a race car does — a vague hypothesis, a broken mechanistic link, a missing control, an underpowered *n* make it pitch and lose contact with reality. WilliamsLab is the **active-suspension controller**: it reads telemetry across the whole load path (hypothesis → mechanism → assay → cohort → data → statistics → story) and calls the counter-actuation *before* you commit budget to the corner.

## What v1 does

This is a **frontend-first MVP** — a thinking-and-planning cockpit over one shared graph, not a data-processing backend. Everything is derived from a single seed project object and persisted to `localStorage`.

- **Overview** — project home, rigor score, top issues.
- **Dashboard** — the Brugada project at a glance: central hypothesis, molecular + clinical axes, planned assays, expected outputs, bottlenecks, next steps.
- **Hypotheses** — falsifiable claims with predicted direction, effect size, and kill-criteria. Add / edit / delete from the UI.
- **Mechanism Map** — the causal chain, each edge coloured by evidence strength, with a weakest-link callout.
- **Assays** — the assay ↔ claim matrix with live control / power / tissue-match audits. Add / edit / delete, including the power fields.
- **Literature** — **live PubMed search** (NCBI E-utilities, browser-side). Link a hit to a hypothesis and add it to the graph; linking clears that hypothesis's literature-gap flag on the spot.
- **Statistical Power** — a two-sample power / sample-size calculator (normal approximation, with the genome-wide multiple-testing tax on α) plus a per-assay power table. This is the same math the rigor monitor uses.
- **Rigor Monitor** — the signature feature: nine rule-based study-design checks. Toggle pre-registration or set a primary endpoint and watch a flag clear itself.
- **Knowledge Graph** — all node-types on one draggable, typed graph. Add nodes and edges and delete them without touching code.
- **BrS Theory** — an **exhaustive** curated reference on Brugada Syndrome: 17 sections in four groups (Foundations · Mechanism · Clinical · Research frontier) covering history, epidemiology, genetics, cellular electrophysiology, the competing mechanisms, the full clinical picture (presentation & overlap syndromes, ECG, provocation, diagnosis, risk, management, special populations) and the epigenetic frontier — with a grouped sticky table of contents, gene/ECG/overlap/Shanghai/risk tables and high-yield / clinical / research callouts. No API key needed.
- **Knowledge Review** — an AI-powered, high-yield review of Brugada Syndrome (OpenAI, streaming), tied to your project's hypotheses. Topic presets + free-form Q&A. See setup below.
- **✦ Ask AI copilot** — a global, context-aware assistant available on **every page** (floating dock). It knows the current page and your project, and streams answers on BrS science, study design, stats and the app. Uses the same OpenAI key as Knowledge Review.

The UI uses a **claymorphism** treatment (soft, puffy surfaces with layered inset highlights) over the Williams 1993 livery palette.

### Knowledge Review — OpenAI setup

The Knowledge Review page calls OpenAI directly from the browser (the API is CORS-enabled). Provide a key either way:

1. **In-app (recommended):** Knowledge Review → **⚙ Settings** → paste your key. It is stored only in your browser's `localStorage`.
2. **Env file:** copy `.env.example` to `.env.local` and set `VITE_OPENAI_API_KEY=sk-…`, then `npm run dev`. `.env.local` is gitignored.

Default model is `gpt-5.1-chat-latest`; switch to `gpt-4o` / `gpt-4o-mini` etc. in Settings. **Never commit a key or deploy a build that inlines one.**

### The nine sensors
`unclear_hypothesis` · `weak_mechanistic_chain` · `missing_control` · `assay_mismatch` · `underpowered_design` · `literature_gap` · `statistical_ambiguity` · `infeasible_protocol` · `manuscript_story_weakness` — implemented as pure functions over project state in [`src/lib/suspension.ts`](src/lib/suspension.ts).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run typecheck
```

Node 18+ recommended.

## Deploy

Static SPA — any static host works. `vercel.json` pins the Vite build for **Vercel**:
import the repo at [vercel.com/new](https://vercel.com/new) and it auto-builds
`npm run build` → `dist/` on every push to `main`. Routing uses `HashRouter`, so
deep links work with no rewrite rules.

Do **not** set `VITE_OPENAI_API_KEY` in the deployment — it would inline your key
into the public bundle. Leave it unset; users paste their own key in-app
(Knowledge Review → stored in their browser only).

## Architecture

```
src/
  types.ts            # the knowledge-graph schema (nodes, edges, hypotheses, assays…)
  data/seed.ts        # the Brugada seed project — single source of truth
  lib/
    suspension.ts     # the rigor-monitor checks  ← the differentiator
    power.ts          # two-sample power / sample-size math
    pubmed.ts         # NCBI E-utilities client (browser-side)
    openai.ts         # OpenAI streaming client (browser-side, BYO key)
    brsReview.ts      # Brugada review presets + context-aware system prompt
    store.tsx         # localStorage-backed React store with full CRUD
    palette.ts        # Williams 1993 livery tokens
  components/         # Layout (app shell), GraphView (SVG graph), Modal, Markdown, ui
  pages/             # Overview(Garage), Dashboard(PitWall), Hypotheses, Mechanism,
                     # Assays, Literature(Radar), Power, Rigor(Suspension), Graph, Review
db/schema.sql        # future Postgres path (graph-over-relational)
concept/             # the WilliamsLab concept microsite (design brief)
```

**Stack:** Vite + React + TypeScript. Custom SVG graph (no heavy deps). Plain CSS with the Williams livery token system (Day / Night themes).

## Roadmap

- **Shipped** — live PubMed search & import; the power / sample-size calculator + quantitative underpowered check; add / edit / delete for hypotheses, assays, nodes and edges; the OpenAI-powered Knowledge Review.
- **Next** — LLM-assisted hypothesis critique and edge-evidence grading (reuse the OpenAI client); figure-plan & IMRaD export; saved PubMed queries with contradiction ranking; power for paired / ANOVA / survival designs.
- **v2** — the Postgres backend in `db/schema.sql`; multi-project; collaborator roles; protocol → ethics draft generation.
- **Deliberately out of scope for now** — running real bioinformatics/compute, full ELN/LIMS, automated ethics filing, mobile.

## Livery

Williams 1993 / FW15C: Williams navy `#0A1F6B`, race blue `#1746D1`, Canon red `#E2001A`, Camel yellow `#FFCC00`, go-green `#12B981` on pit white. Racing lexicon mapped to research: Pit Wall = dashboard, active suspension = instability repair, downforce = statistical power, grip = contact with evidence, stint = an experimental run, podium = publication.

---

*Machine 03 of 03. Own the unknown. Ship the discovery.*
