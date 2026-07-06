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

function Box({ x, y, w, h, fill, stroke, ink, t, s }: { x: number; y: number; w: number; h: number; fill: string; stroke?: string; ink: string; t: string; s?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke={stroke ?? 'none'} strokeWidth={stroke ? 1.6 : 0} />
      <text x={x + w / 2} y={y + (s ? h / 2 - 3 : h / 2 + 4)} textAnchor="middle" fontSize="12" fontWeight={700} fill={ink} style={sans}>{t}</text>
      {s && <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" fontSize="9" fill={ink} opacity={0.8} style={mono}>{s}</text>}
    </g>
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
        <Box x={6} y={76} w={158} h={58} fill="var(--navy)" ink="#fff" t="Epigenetic change" s="5mC · H3K27me3 · ncRNA" />
        <Box x={186} y={80} w={120} h={50} fill="var(--blue)" ink="#fff" t="↓ Naᵥ1.5" s="expression" />
        <Box x={326} y={80} w={94} h={50} fill="var(--blue)" ink="#fff" t="↓ I_Na" />
        <Box x={452} y={16} w={190} h={52} fill="var(--card)" stroke="var(--amber)" ink="var(--ink)" t="Conduction delay" s="RVOT · depolarization" />
        <Box x={452} y={142} w={190} h={52} fill="var(--card)" stroke="var(--violet)" ink="var(--ink)" t="Loss of AP dome" s="phase-2 re-entry" />
        <Box x={676} y={80} w={120} h={50} fill="var(--card)" stroke="var(--red)" ink="var(--red)" t="Type-1 ECG" />
        <Box x={818} y={80} w={156} h={50} fill="var(--red)" ink="#fff" t="VF / SCD" />
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
        <path d="M48,246 L104,246 L114,66 L132,98 C190,86 300,92 360,100 L446,246 L694,246" fill="none" stroke="var(--navy)" strokeWidth={3} />
        {/* phase labels */}
        {[['0', 96, 150], ['1', 140, 84], ['2', 250, 82], ['3', 410, 150], ['4', 560, 238]].map(([l, x, y]) => (
          <text key={l as string} x={x as number} y={y as number} textAnchor="middle" fontSize="12" fontWeight={800} fill="var(--ink)" style={sans}>{l}</text>
        ))}
        {/* currents */}
        <text x={122} y={200} textAnchor="middle" fontSize="10" fontWeight={700} fill="var(--red)" style={mono}>I_Na ↓</text>
        <text x={150} y={64} textAnchor="middle" fontSize="9.5" fill="var(--blue)" style={mono}>I_to</text>
        <text x={255} y={110} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>I_CaL</text>
        <text x={430} y={120} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>I_Kr / I_Ks</text>
        <text x={585} y={240} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>I_K1</text>
      </svg>
    </Figure>
  )
}

// 3 · type-1/2/3 ECG morphology
export function EcgTypes() {
  const panel = (p: number, path: string, title: string, sub: string, ink: string) => (
    <g>
      <line x1={p + 12} y1={118} x2={p + 214} y2={118} stroke="var(--line)" strokeWidth={1} strokeDasharray="3 3" />
      <path d={path} fill="none" stroke={ink} strokeWidth={2.4} />
      <text x={p + 113} y={162} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--ink)" style={sans}>{title}</text>
      <text x={p + 113} y={178} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>{sub}</text>
    </g>
  )
  return (
    <Figure caption="Right-precordial (V1–V2) ST-T morphologies. Only the coved type-1 pattern is diagnostic; saddleback type-2/3 require provocation.">
      <svg viewBox="0 0 700 195" style={sans}>
        {panel(0, 'M14,118 L60,118 L70,40 L80,58 C110,52 150,120 175,150 L214,150', 'Type 1', 'coved · diagnostic', 'var(--red)')}
        {panel(240, 'M254,118 L300,118 L310,42 L320,74 L345,96 L370,70 L400,86 L454,96', 'Type 2', 'saddleback', 'var(--blue)')}
        {panel(480, 'M494,118 L540,118 L550,64 L560,96 L585,104 L610,92 L694,100', 'Type 3', 'low saddle', 'var(--muted)')}
      </svg>
    </Figure>
  )
}

// 4 · genetic architecture
export function GeneticsChart() {
  const seg = (x: number, w: number, fill: string, label: string, pct: string) => (
    <g>
      <rect x={x} y={40} width={w} height={44} fill={fill} />
      <text x={x + w / 2} y={68} textAnchor="middle" fontSize="12" fontWeight={800} fill={fill === 'var(--card-2)' ? 'var(--ink-2)' : '#fff'} style={sans}>{pct}</text>
      <text x={x + w / 2} y={104} textAnchor="middle" fontSize="9.5" fill="var(--muted)" style={mono}>{label}</text>
    </g>
  )
  return (
    <Figure caption="Genetic architecture of BrS. SCN5A explains only ~20–30% of cases; the unexplained majority — enriched for regulatory/common variation — is the doorway to epigenetics.">
      <svg viewBox="0 0 700 120" style={sans}>
        {seg(30, 168, 'var(--blue)', 'SCN5A', '~25%')}
        {seg(198, 42, 'var(--violet)', 'rare genes', '~5%')}
        {seg(240, 430, 'var(--card-2)', 'unexplained · regulatory', '~70%')}
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
        {[96, 116, 136, 486, 506].map((x, i) => (
          <g key={i}>
            <line x1={x} y1={150} x2={x} y2={128} stroke="var(--violet)" strokeWidth={1.6} />
            <circle cx={x} cy={124} r={5} fill="var(--violet)" />
          </g>
        ))}
        <text x={116} y={112} textAnchor="middle" fontSize="9" fill="var(--violet)" style={mono}>5mC</text>
        {/* nucleosomes with marks */}
        <circle cx={230} cy={158} r={15} fill="var(--blue)" opacity={0.85} />
        <text x={230} y={132} textAnchor="middle" fontSize="9" fill="var(--red)" style={mono}>H3K27me3</text>
        <circle cx={330} cy={158} r={15} fill="var(--blue)" opacity={0.85} />
        <text x={330} y={132} textAnchor="middle" fontSize="9" fill="var(--good-ink)" style={mono}>H3K27ac</text>
        {/* looping arc enhancer→promoter */}
        <path d="M500,150 C470,70 150,70 118,150" fill="none" stroke="var(--amber)" strokeWidth={2} strokeDasharray="5 4" />
        <text x={310} y={70} textAnchor="middle" fontSize="9" fill="var(--amber)" style={mono}>enhancer–promoter loop</text>
        {/* output */}
        <Arrow d="M320,166 L320,196" />
        <Box x={236} y={198} w={170} h={44} fill="var(--card)" stroke="var(--red)" ink="var(--ink)" t="↓ Naᵥ1.5 → ↓ I_Na" />
        {/* ncRNA */}
        <text x={640} y={210} textAnchor="middle" fontSize="10" fontWeight={700} fill="var(--muted)" style={mono}>miRNA ⊣ mRNA</text>
        <Arrow d="M600,205 L416,214" />
      </svg>
    </Figure>
  )
}
