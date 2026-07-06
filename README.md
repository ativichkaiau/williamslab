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

- **Garage** — project home, chassis-stability score, top instabilities.
- **Pit Wall** — the Brugada dashboard: central hypothesis, molecular + clinical axes, assay stints, expected outputs, bottlenecks, next actions.
- **Hypotheses** — falsifiable claims with predicted direction, effect size, and kill-criteria.
- **Mechanism Map** — the causal chain, each edge coloured by evidence strength, with a weakest-link callout.
- **Assays** — the assay ↔ claim matrix with live control / power / tissue-match audits.
- **Literature Radar** — support/contradiction + a gap map (manual import in v1).
- **Active Suspension** — the signature feature: nine rule-based instability sensors. Toggle pre-registration or set a primary endpoint and watch a flag clear itself.
- **Knowledge Graph** — all node-types on one draggable, typed graph.

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

## Architecture

```
src/
  types.ts            # the knowledge-graph schema (nodes, edges, hypotheses, assays…)
  data/seed.ts        # the Brugada seed project — single source of truth
  lib/
    suspension.ts     # the active-suspension sensor rules  ← the differentiator
    store.tsx         # localStorage-backed React store
    palette.ts        # Williams 1993 livery tokens
  components/         # Layout (app shell), GraphView (SVG graph), ui
  pages/             # Garage, PitWall, Hypotheses, Mechanism, Assays, Radar, Suspension, Graph
db/schema.sql        # future Postgres path (graph-over-relational)
concept/             # the WilliamsLab concept microsite (design brief)
```

**Stack:** Vite + React + TypeScript. Custom SVG graph (no heavy deps). Plain CSS with the Williams livery token system (Day / Night themes).

## Roadmap

- **v1.x** — PubMed E-utilities auto-ingestion; power/sample-size calculators; figure-plan & IMRaD export; LLM-assisted hypothesis critique and edge-evidence grading.
- **v2** — the Postgres backend in `db/schema.sql`; multi-project; collaborator roles; protocol → ethics draft generation.
- **Deliberately out of scope for now** — running real bioinformatics/compute, full ELN/LIMS, automated ethics filing, mobile.

## Livery

Williams 1993 / FW15C: Williams navy `#0A1F6B`, race blue `#1746D1`, Canon red `#E2001A`, Camel yellow `#FFCC00`, go-green `#12B981` on pit white. Racing lexicon mapped to research: Pit Wall = dashboard, active suspension = instability repair, downforce = statistical power, grip = contact with evidence, stint = an experimental run, podium = publication.

---

*Machine 03 of 03. Own the unknown. Ship the discovery.*
