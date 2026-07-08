import { type ReactNode } from 'react'

// Schematic SVG diagrams for the BrS Theory page. All use CSS livery
// variables so they theme with day/night. Educational schematics.

export function Figure({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="diagram">
      {children}
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

const sans = { fontFamily: 'var(--sans)' } as const
const mono = { fontFamily: 'var(--mono)' } as const

// Hover target with a native tooltip. `tip` shows on hover; the CSS class adds
// a cursor + subtle highlight so the schematic reads as interactive.
function Tip({ tip, children }: { tip?: string; children: ReactNode }) {
  return (
    <g className={tip ? 'dgm-node' : undefined}>
      {tip && <title>{tip}</title>}
      {children}
    </g>
  )
}

function Box({ x, y, w, h, fill, stroke, ink, t, s, tip }: { x: number; y: number; w: number; h: number; fill: string; stroke?: string; ink: string; t: string; s?: string; tip?: string }) {
  return (
    <Tip tip={tip}>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke={stroke ?? 'none'} strokeWidth={stroke ? 1.6 : 0} />
      <text x={x + w / 2} y={y + (s ? h / 2 - 3 : h / 2 + 4)} textAnchor="middle" fontSize="12" fontWeight={700} fill={ink} style={sans}>{t}</text>
      {s && <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" fontSize="9" fill={ink} opacity={0.8} style={mono}>{s}</text>}
    </Tip>
  )
}

const Arrow = ({ d }: { d: string }) => <path d={d} fill="none" stroke="var(--muted)" strokeWidth={1.8} markerEnd="url(#tri)" />

function Defs() {
  return (
    <defs>
      <marker id="tri" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
        <path d="M0,0 L7,3 L0,6 Z" fill="var(--muted)" />
      </marker>
    </defs>
  )
}

// 1 · causal cascade — epigenetics → phenotype
export function MechanismFlow() {
  return (
    <Figure caption="The causal cascade: epigenetic dysregulation lowers Naᵥ1.5 and I_Na, producing the two mechanistic routes to the type-1 ECG and VF.">
      <svg viewBox="0 0 980 210" style={sans}>
        <Defs />
        <Arrow d="M164,105 L182,105" />
        <Arrow d="M306,105 L324,105" />
        <Arrow d="M420,96 C440,70 442,52 450,42" />
        <Arrow d="M420,114 C440,150 442,162 450,170" />
        <Arrow d="M642,42 C660,60 662,80 674,96" />
        <Arrow d="M642,170 C660,150 662,128 674,114" />
        <Arrow d="M796,105 L816,105" />
        <Box x={6} y={76} w={158} h={58} fill="var(--navy)" ink="#fff" t="Epigenetic change" s="5mC · H3K27me3 · ncRNA" tip="Promoter/enhancer methylation, repressive histone marks and ncRNAs lower Naᵥ1.5 dosage without altering the coding sequence — the project’s central lever." />
        <Box x={186} y={80} w={120} h={50} fill="var(--blue)" ink="#fff" t="↓ Naᵥ1.5" s="expression" tip="Less Naᵥ1.5 channel protein reaches the sarcolemma, reducing available sodium current." />
        <Box x={326} y={80} w={94} h={50} fill="var(--blue)" ink="#fff" t="↓ I_Na" tip="Reduced peak inward sodium current (I_Na) is the single organising defect of Brugada Syndrome." />
        <Box x={452} y={16} w={190} h={52} fill="var(--card)" stroke="var(--amber)" ink="var(--ink)" t="Conduction delay" s="RVOT · depolarization" tip="Depolarization hypothesis: slowed conduction in the right-ventricular outflow tract creates the ST elevation and re-entry substrate." />
        <Box x={452} y={142} w={190} h={52} fill="var(--card)" stroke="var(--violet)" ink="var(--ink)" t="Loss of AP dome" s="phase-2 re-entry" tip="Repolarization hypothesis: an unopposed I_to notch abolishes the epicardial action-potential dome, driving phase-2 re-entry." />
        <Box x={676} y={80} w={120} h={50} fill="var(--card)" stroke="var(--red)" ink="var(--red)" t="Type-1 ECG" tip="The coved-type ST elevation in V1–V2 — the only diagnostic Brugada morphology." />
        <Box x={818} y={80} w={156} h={50} fill="var(--red)" ink="#fff" t="VF / SCD" tip="Polymorphic VT / ventricular fibrillation on the re-entrant substrate → sudden cardiac death, classically at rest or during sleep." />
      </svg>
    </Figure>
  )
}

// 2 · ventricular action potential + currents
export function ActionPotential() {
  return (
    <Figure caption="The ventricular action potential. Phase 0 is driven by I_Na (Naᵥ1.5); the I_to notch (phase 1) is largest in RV epicardium. In BrS, reduced I_Na blunts phase 0 and tips the phase-1/2 balance.">
      <svg viewBox="0 0 720 290" style={sans}>
        {/* axes */}
        <line x1={48} y1={36} x2={48} y2={258} stroke="var(--line)" strokeWidth={1.5} />
        <line x1={48} y1={258} x2={694} y2={258} stroke="var(--line)" strokeWidth={1.5} />
        {[['+30', 70], ['0', 150], ['−85', 246]].map(([l, y]) => (
          <text key={l as string} x={40} y={(y as number) + 3} textAnchor="end" fontSize="9" fill="var(--muted)" style={mono}>{l}</text>
        ))}
        <text x={20} y={44} fontSize="9" fill="var(--muted)" style={mono}>mV</text>
        <text x={690} y={276} textAnchor="end" fontSize="9" fill="var(--muted)" style={mono}>time →</text>
        {/* AP curve */}
        <Tip tip="The ventricular action potential. In BrS, reduced I_Na blunts the phase-0 upstroke and tips the phase-1/2 balance toward loss of the dome.">
          <path d="M48,246 L104,246 L114,66 L132,98 C190,86 300,92 360,100 L446,246 L694,246" fill="none" stroke="var(--navy)" strokeWidth={3} />
        </Tip>
        {/* phase labels */}
        {[['0', 96, 150, 'Phase 0 — rapid depolarization driven by I_Na (Naᵥ1.5); reduced in BrS.'], ['1', 140, 84, 'Phase 1 — early repolarization notch set by I_to, largest in RV epicardium.'], ['2', 250, 82, 'Phase 2 — the plateau/dome, a balance of inward I_CaL and outward K⁺ currents.'], ['3', 410, 150, 'Phase 3 — repolarization by I_Kr / I_Ks.'], ['4', 560, 238, 'Phase 4 — resting potential held near −85 mV by I_K1.']].map(([l, x, y, tip]) => (
          <Tip key={l as string} tip={tip as string}>
            <text x={x as number} y={y as number} textAnchor="middle" fontSize="12" fontWeight={800} fill="var(--ink)" style={sans}>{l}</text>
          </Tip>
        ))}
        {/* currents */}
        <Tip tip="I_Na — peak sodium current (Naᵥ1.5). Its loss of function is the core BrS defect."><text x={122} y={200} textAnchor="middle" fontSize="10" fontWeight={700} fill="var(--red)" style={mono}>I_Na ↓</text></Tip>
        <Tip tip="I_to — transient outward K⁺ current; the phase-1 notch, most prominent in RV epicardium."><text x={150} y={64} textAnchor="middle" fontSize="9.5" fill="var(--blue)" style={mono}>I_to</text></Tip>
        <Tip tip="I_CaL — L-type calcium current maintaining the plateau (dome)."><text x={255} y={110} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>I_CaL</text></Tip>
        <Tip tip="I_Kr / I_Ks — delayed-rectifier K⁺ currents driving phase-3 repolarization."><text x={430} y={120} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>I_Kr / I_Ks</text></Tip>
        <Tip tip="I_K1 — inward-rectifier K⁺ current setting the resting membrane potential."><text x={585} y={240} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>I_K1</text></Tip>
      </svg>
    </Figure>
  )
}

// 3 · type-1/2/3 ECG morphology
export function EcgTypes() {
  const panel = (p: number, path: string, title: string, sub: string, ink: string, tip: string) => (
    <Tip tip={tip}>
      <line x1={p + 12} y1={118} x2={p + 214} y2={118} stroke="var(--line)" strokeWidth={1} strokeDasharray="3 3" />
      <path d={path} fill="none" stroke={ink} strokeWidth={2.4} />
      <text x={p + 113} y={162} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--ink)" style={sans}>{title}</text>
      <text x={p + 113} y={178} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>{sub}</text>
    </Tip>
  )
  return (
    <Figure caption="Right-precordial (V1–V2) ST-T morphologies. Only the coved type-1 pattern is diagnostic; saddleback type-2/3 require provocation.">
      <svg viewBox="0 0 700 195" style={sans}>
        {panel(0, 'M14,118 L60,118 L70,40 L80,58 C110,52 150,120 175,150 L214,150', 'Type 1', 'coved · diagnostic', 'var(--red)', 'Type-1: ≥2 mm coved ST elevation with a descending ST and negative T. The only diagnostic pattern — no provocation needed.')}
        {panel(240, 'M254,118 L300,118 L310,42 L320,74 L345,96 L370,70 L400,86 L454,96', 'Type 2', 'saddleback', 'var(--blue)', 'Type-2: saddleback with ≥0.5 mm ST elevation. Suggestive only — requires a sodium-channel-blocker challenge to confirm.')}
        {panel(480, 'M494,118 L540,118 L550,64 L560,96 L585,104 L610,92 L694,100', 'Type 3', 'low saddle', 'var(--muted)', 'Type-3: low saddleback (<0.5 mm). Non-diagnostic; managed like type-2 with provocation testing.')}
      </svg>
    </Figure>
  )
}

// 4 · genetic architecture
export function GeneticsChart() {
  const seg = (x: number, w: number, fill: string, label: string, pct: string, tip: string) => (
    <Tip tip={tip}>
      <rect x={x} y={40} width={w} height={44} fill={fill} />
      <text x={x + w / 2} y={68} textAnchor="middle" fontSize="12" fontWeight={800} fill={fill === 'var(--card-2)' ? 'var(--ink-2)' : '#fff'} style={sans}>{pct}</text>
      <text x={x + w / 2} y={104} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>{label}</text>
    </Tip>
  )
  return (
    <Figure caption="Genetic architecture of BrS. SCN5A explains only ~20–30% of cases; the unexplained majority — enriched for regulatory/common variation — is the doorway to epigenetics.">
      <svg viewBox="0 0 700 120" style={sans}>
        {seg(30, 168, 'var(--blue)', 'SCN5A', '~25%', 'SCN5A (Naᵥ1.5): the first and commonest BrS gene, but still only ~20–30% of cases — mostly loss-of-function variants.')}
        {seg(198, 42, 'var(--violet)', 'rare genes', '~5%', 'A long tail of rarer genes (e.g. SCN10A, SCN1B, CACNA1C, GPD1L) — individually uncommon and several with debated validity.')}
        {seg(240, 430, 'var(--card-2)', 'unexplained · regulatory', '~70%', 'The unexplained majority — enriched for common/regulatory variation and, plausibly, epigenetic dysregulation. This is where the project aims.')}
        <rect x={30} y={40} width={640} height={44} rx={8} fill="none" stroke="var(--line)" strokeWidth={1.5} />
      </svg>
    </Figure>
  )
}

// 5 · epigenetic regulation of the locus
export function EpiRegulation() {
  return (
    <Figure caption="Regulation above the sequence: promoter/enhancer methylation, repressive vs active histone marks, enhancer–promoter looping, and ncRNAs converge to set Naᵥ1.5 dosage.">
      <svg viewBox="0 0 720 250" style={sans}>
        <Defs />
        {/* locus bar */}
        <rect x={40} y={150} width={560} height={16} rx={6} fill="var(--card-2)" stroke="var(--line)" strokeWidth={1.4} />
        <text x={120} y={186} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>SCN5A promoter</text>
        <text x={510} y={186} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>SCN10A enhancer</text>
        {/* methylation lollipops */}
        <Tip tip="5-methylcytosine (5mC) at promoter/enhancer CpGs. Dense methylation typically represses transcription and can lower Naᵥ1.5 expression.">
          {[96, 116, 136, 486, 506].map((x, i) => (
            <g key={i}>
              <line x1={x} y1={150} x2={x} y2={128} stroke="var(--violet)" strokeWidth={1.6} />
              <circle cx={x} cy={124} r={5} fill="var(--violet)" />
            </g>
          ))}
          <text x={116} y={112} textAnchor="middle" fontSize="9" fill="var(--violet)" style={mono}>5mC</text>
        </Tip>
        {/* nucleosomes with marks */}
        <Tip tip="H3K27me3 — a repressive histone mark deposited by PRC2. Enrichment over the locus silences transcription.">
          <circle cx={230} cy={158} r={15} fill="var(--blue)" opacity={0.85} />
          <text x={230} y={132} textAnchor="middle" fontSize="9" fill="var(--red)" style={mono}>H3K27me3</text>
        </Tip>
        <Tip tip="H3K27ac — an active mark of engaged promoters/enhancers. Its loss shifts the locus toward silencing.">
          <circle cx={330} cy={158} r={15} fill="var(--blue)" opacity={0.85} />
          <text x={330} y={132} textAnchor="middle" fontSize="9" fill="var(--good-ink)" style={mono}>H3K27ac</text>
        </Tip>
        {/* looping arc enhancer→promoter */}
        <Tip tip="Enhancer–promoter looping brings the SCN10A enhancer to the SCN5A promoter. Disrupted looping reduces Naᵥ1.5 transcription.">
          <path d="M500,150 C470,70 150,70 118,150" fill="none" stroke="var(--amber)" strokeWidth={2} strokeDasharray="5 4" />
          <text x={310} y={70} textAnchor="middle" fontSize="9" fill="var(--amber)" style={mono}>enhancer–promoter loop</text>
        </Tip>
        {/* output */}
        <Arrow d="M320,166 L320,196" />
        <Box x={236} y={198} w={170} h={44} fill="var(--card)" stroke="var(--red)" ink="var(--ink)" t="↓ Naᵥ1.5 → ↓ I_Na" tip="Net effect: every layer above converges on lower Naᵥ1.5 dosage and reduced I_Na — the Brugada substrate." />
        {/* ncRNA */}
        <Tip tip="Non-coding RNAs (e.g. miRNAs) bind the transcript and repress translation, adding a post-transcriptional layer of Naᵥ1.5 control.">
          <text x={640} y={210} textAnchor="middle" fontSize="10" fontWeight={700} fill="var(--muted)" style={mono}>miRNA ⊣ mRNA</text>
        </Tip>
        <Arrow d="M600,205 L416,214" />
      </svg>
    </Figure>
  )
}
