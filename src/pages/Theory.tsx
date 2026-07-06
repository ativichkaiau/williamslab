import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Kicker, Rule } from '../components/ui'

const SECTIONS: { id: string; title: string }[] = [
  { id: 'overview', title: 'Overview' },
  { id: 'genetics', title: 'Genetics' },
  { id: 'molecular', title: 'Molecular basis' },
  { id: 'mechanism', title: 'Pathophysiology' },
  { id: 'ecg', title: 'ECG & diagnosis' },
  { id: 'risk', title: 'Risk stratification' },
  { id: 'management', title: 'Management' },
  { id: 'epigenetics', title: 'Epigenetics frontier' },
  { id: 'controversies', title: 'Open questions' },
]

function KeyBox({ kind, label, children }: { kind: 'hy' | 'research'; label: string; children: ReactNode }) {
  return (
    <div className={`keybox ${kind}`}>
      <span className="kb-l">{label}</span>
      {children}
    </div>
  )
}

function Sec({ id, no, title, children }: { id: string; no: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="theory-sec">
      <h2><span className="no">{no}</span>{title}</h2>
      <div className="prose">{children}</div>
    </section>
  )
}

export default function Theory() {
  const [active, setActive] = useState('overview')

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  // Instant jump; the section's scroll-margin-top clears the sticky topbar.
  // (Deliberately not 'smooth' — reliable across browsers and headless.)
  const go = (id: string) => document.getElementById(id)?.scrollIntoView()

  return (
    <>
      <div className="page-head">
        <Rule />
        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Kicker>BRUGADA SYNDROME · THEORY REFERENCE</Kicker>
            <h1 style={{ marginTop: 12 }}>BrS Theory</h1>
            <p>A curated, high-yield reference on the theory of Brugada Syndrome — genetics, molecular basis, competing mechanisms, ECG, risk and management — with the epigenetic frontier your project targets. Static and always available (no API key needed).</p>
          </div>
          <div className="row-actions" style={{ flex: 'none' }}>
            <Link className="icon-btn" to="/review">Ask the Review →</Link>
            <Link className="icon-btn" to="/graph">Graph →</Link>
          </div>
        </div>
      </div>

      <div className="theory">
        <nav className="theory-toc">
          <div className="h">On this page</div>
          {SECTIONS.map((s, i) => (
            <button key={s.id} className={`toc-link${active === s.id ? ' active' : ''}`} onClick={() => { setActive(s.id); go(s.id) }}>
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              {s.title}
            </button>
          ))}
        </nav>

        <div className="theory-body">
          <Sec id="overview" no="01" title="Overview & definition">
            <p><span className="term">Brugada Syndrome (BrS)</span> is an inherited primary electrical disease — a cardiac <b>channelopathy</b> — defined by a <b>coved-type (type 1) ST-segment elevation</b> in the right precordial leads (V1–V2), predisposing to <b>polymorphic ventricular tachycardia / ventricular fibrillation (VF)</b> and <b>sudden cardiac death (SCD)</b>, classically in a <b>structurally normal heart</b>.</p>
            <p>First described in 1992 by <b>Pedro and Josep Brugada</b>. It is a leading cause of SCD in young adults (peak events in the 30s–40s) without overt structural disease, and disproportionately affects <b>men (~8–10:1)</b> — attributed to a larger transient outward current (I<sub>to</sub>) under testosterone.</p>
            <ul>
              <li><b>Prevalence</b> ≈ 1–5 per 10,000; markedly higher in <b>Southeast/East Asia</b>, where it underlies the "sudden unexpected nocturnal death" syndromes (SUNDS, Lai Tai, Bangungut).</li>
              <li>Events are often <b>nocturnal / at rest</b>, and dynamically modulated by <b>fever</b>, vagal tone, and drugs.</li>
            </ul>
            <KeyBox kind="hy" label="High-yield">
              BrS is a <b>loss-of-function</b> sodium-channel disease at its core: reduced I<sub>Na</sub> → the type-1 ECG and arrhythmic substrate. Everything below hangs off that axis.
            </KeyBox>
          </Sec>

          <Sec id="genetics" no="02" title="Genetics & inheritance">
            <p>Inheritance is classically <b>autosomal dominant</b> with <b>incomplete penetrance</b> and <b>variable expressivity</b> — the same variant can produce anything from a silent carrier to aborted SCD.</p>
            <p><span className="term">SCN5A</span> (encoding the Na<sub>v</sub>1.5 α-subunit) is the <b>major gene</b>, but <b>loss-of-function SCN5A variants explain only ~20–30%</b> of clinically diagnosed cases. The unexplained majority — the <b>"missing heritability"</b> — is the central puzzle, and the doorway to regulatory and epigenetic mechanisms.</p>
            <div className="tbl-scroll">
              <table>
                <thead><tr><th>Gene</th><th>Product</th><th>Effect</th><th>Note</th></tr></thead>
                <tbody>
                  <tr><td><b>SCN5A</b></td><td>Na<sub>v</sub>1.5 α</td><td>↓ I<sub>Na</sub> (LoF)</td><td className="muted">Major gene · ~20–30% of cases</td></tr>
                  <tr><td>SCN10A</td><td>Na<sub>v</sub>1.8</td><td>Modulates conduction / Na<sub>v</sub>1.5</td><td className="muted">GWAS SCN5A–SCN10A locus</td></tr>
                  <tr><td>SCN1B / SCN3B</td><td>Na channel β-subunits</td><td>Altered trafficking/gating</td><td className="muted">Rare</td></tr>
                  <tr><td>CACNA1C / CACNB2</td><td>L-type Ca channel</td><td>↓ I<sub>Ca,L</sub></td><td className="muted">BrS + short-QT overlap</td></tr>
                  <tr><td>GPD1L</td><td>—</td><td>↓ Na<sub>v</sub>1.5 surface expression</td><td className="muted">Rare</td></tr>
                  <tr><td>KCND3</td><td>K<sub>v</sub>4.3 (I<sub>to</sub>)</td><td>↑ I<sub>to</sub> (GoF)</td><td className="muted">Rare</td></tr>
                  <tr><td>HEY2</td><td>Transcription factor</td><td>Transmural gradient</td><td className="muted">Common-variant (GWAS)</td></tr>
                </tbody>
              </table>
            </div>
            <p>Many additional genes (SCN2B, KCNE3/5, HCN4, RANGRF, SLMAP, TRPM4, PKP2…) are reported but mostly of <b>uncertain significance</b>. The field has shifted from a <b>monogenic</b> model toward an <b>oligogenic / polygenic</b> one, with common regulatory variants (the <b>SCN5A–SCN10A</b> and <b>HEY2</b> loci) contributing to conduction and risk.</p>
            <KeyBox kind="research" label="Research link">
              Common-variant signals sit in <b>regulatory (enhancer/promoter)</b> DNA, not coding sequence. That is exactly where DNA methylation and histone state act — the premise of your project's epigenetic hypotheses.
            </KeyBox>
          </Sec>

          <Sec id="molecular" no="03" title="Molecular basis — Naᵥ1.5 & Iₙₐ">
            <p><span className="term">Na<sub>v</sub>1.5</span> is the pore-forming α-subunit of the cardiac voltage-gated sodium channel. It carries the fast inward sodium current <b>I<sub>Na</sub></b> responsible for <b>phase 0</b> of the action potential — the steep upstroke that drives rapid, coordinated <b>conduction</b>.</p>
            <p>BrS variants reduce functional I<sub>Na</sub> by one or more routes:</p>
            <ul>
              <li><b>Reduced expression / trafficking</b> — fewer channels reach the membrane.</li>
              <li><b>Altered gating</b> — e.g. enhanced/earlier inactivation, delayed recovery, shifted activation.</li>
              <li><b>Non-functional channels</b> — nonsense/frameshift, dominant-negative effects.</li>
            </ul>
            <p>Na<sub>v</sub>1.5 operates within a <b>macromolecular complex</b> (β-subunits, cytoskeletal and trafficking partners) and its <b>membrane density</b> is tightly regulated — a level at which <b>expression control</b> (transcriptional and epigenetic) directly sets how much I<sub>Na</sub> the cell has.</p>
          </Sec>

          <Sec id="mechanism" no="04" title="Pathophysiology — competing hypotheses">
            <p>How reduced I<sub>Na</sub> produces the type-1 ECG and VF is debated between two (not mutually exclusive) models, plus an emerging structural view.</p>
            <div className="tbl-scroll">
              <table>
                <thead><tr><th></th><th>Depolarization hypothesis</th><th>Repolarization hypothesis</th></tr></thead>
                <tbody>
                  <tr><td><b>Core idea</b></td><td>Conduction delay in the <b>RVOT</b></td><td>Loss of the AP <b>dome</b> in RV epicardium</td></tr>
                  <tr><td><b>Key current</b></td><td>↓ I<sub>Na</sub></td><td>↑ I<sub>to</sub> unopposed by ↓ I<sub>Na</sub></td></tr>
                  <tr><td><b>ST elevation from</b></td><td>Delayed RVOT activation / current-to-load mismatch</td><td>Transmural voltage gradient (epi vs endo)</td></tr>
                  <tr><td><b>Arrhythmia</b></td><td>Reentry via slow conduction</td><td><b>Phase-2 reentry</b></td></tr>
                  <tr><td><b>Supported by</b></td><td>Fragmented RVOT electrograms; ablation success; subtle structural change</td><td>Male predominance (I<sub>to</sub>); quinidine (I<sub>to</sub> block); wedge preparations</td></tr>
                  <tr><td><b>Implication</b></td><td>Ablate the RVOT substrate</td><td>Quinidine, isoproterenol restore the dome</td></tr>
                </tbody>
              </table>
            </div>
            <p>A <b>unifying / structural view</b> increasingly frames BrS as a disease <b>of the RVOT epicardium</b>: subtle fibrosis and reduced connexin-43 create a slow-conduction substrate. Both electrical mechanisms likely coexist, weighted differently between patients.</p>
            <KeyBox kind="hy" label="High-yield">
              The RVOT is the common address for all three views — it is where the ECG changes localise and where <b>epicardial ablation</b> can abolish the type-1 pattern.
            </KeyBox>
          </Sec>

          <Sec id="ecg" no="05" title="ECG patterns & diagnosis">
            <div className="tbl-scroll">
              <table>
                <thead><tr><th>Type</th><th>Morphology</th><th>ST</th><th>T wave</th><th>Diagnostic?</th></tr></thead>
                <tbody>
                  <tr><td><b>Type 1</b></td><td>Coved</td><td>≥2 mm, descending</td><td>Negative</td><td><b>Yes</b> (spontaneous or drug-induced)</td></tr>
                  <tr><td>Type 2</td><td>Saddleback</td><td>≥2 mm then ≥0.5 mm</td><td>Positive/biphasic</td><td className="muted">No — suggestive; provoke</td></tr>
                  <tr><td>Type 3</td><td>Saddle/coved</td><td>&lt;1 mm</td><td>—</td><td className="muted">No</td></tr>
                </tbody>
              </table>
            </div>
            <p>Only the <b>type-1</b> pattern is diagnostic. Sensitivity rises with <b>high right precordial leads</b> (2nd–3rd intercostal space). The pattern is <b>dynamic</b> — unmasked or accentuated by <b>fever</b>, <b>sodium-channel blockers</b>, vagal tone, and certain drugs.</p>
            <h3>Drug (sodium-channel-blocker) challenge</h3>
            <p>Used to unmask type-1 in suspected cases: <b>ajmaline</b>, <b>flecainide</b>, procainamide, pilsicainide. A positive result converts a non-diagnostic ECG to type-1.</p>
            <h3>Diagnosis</h3>
            <p>The <b>Shanghai score (2016)</b> combines ECG (spontaneous vs induced type-1), symptoms/arrhythmia, family history, and genetics. Always exclude <b>Brugada phenocopies</b> — RBBB, ARVC, acute ischaemia/PE, electrolyte disturbance, mechanical (pectus, mediastinal) causes.</p>
            <KeyBox kind="hy" label="Exam trap">
              Type-2/3 patterns are <b>not</b> diagnostic on their own, and a <b>drug-induced</b> type-1 in an asymptomatic person carries much lower risk than a <b>spontaneous</b> one.
            </KeyBox>
          </Sec>

          <Sec id="risk" no="06" title="Risk stratification">
            <p>Risk is driven mainly by <b>arrhythmic history</b> and whether the type-1 pattern is spontaneous:</p>
            <ul>
              <li><b>Highest</b> — aborted SCD or documented sustained VT/VF.</li>
              <li><b>High</b> — <b>syncope</b> (arrhythmic) with a <b>spontaneous type-1</b> ECG.</li>
              <li><b>Lower</b> — asymptomatic, <b>drug-induced</b> type-1 only.</li>
            </ul>
            <p>Additional / debated markers: spontaneous vs induced type-1 (strong), fragmented QRS, early repolarisation, prolonged PR/QRS conduction, S-wave in lead I, atrial fibrillation, SCN5A status, and <b>EP-study-induced VF</b> (controversial). Family history of SCD is a weak predictor.</p>
            <KeyBox kind="research" label="Research link">
              Penetrance and severity vary widely for the same genotype — <b>PR/QRS, spontaneous-vs-induced status, and arrhythmic events</b> are exactly the clinical axes your cohort uses to test whether epigenetic state tracks phenotype.
            </KeyBox>
          </Sec>

          <Sec id="management" no="07" title="Management">
            <ul>
              <li><b>Trigger avoidance</b> — aggressive treatment of <b>fever</b> (antipyretics), avoid provoking drugs (see <i>brugadadrugs.org</i>), moderate alcohol and large meals.</li>
              <li><b>ICD</b> — for aborted SCD or documented VT/VF (secondary prevention); consider for syncope + spontaneous type-1.</li>
              <li><b>Quinidine</b> — I<sub>to</sub> blocker; for recurrent VF / electrical storm, when an ICD is declined, or as adjunct.</li>
              <li><b>Isoproterenol</b> — acute electrical storm (↑ I<sub>Ca,L</sub>, restores the epicardial dome).</li>
              <li><b>Epicardial RVOT ablation</b> — for recurrent VF / storm; can normalise the ECG substrate.</li>
              <li><b>Genetic counselling & family screening</b>.</li>
            </ul>
          </Sec>

          <Sec id="epigenetics" no="08" title="Epigenetics frontier">
            <p>Because coding SCN5A explains a minority of cases, and the strongest common signals are <b>regulatory</b>, attention has turned to how sodium-channel loci are controlled <b>above the DNA sequence</b>:</p>
            <ul>
              <li><b>DNA methylation</b> at SCN5A/SCN10A promoters and enhancers, modulating expression.</li>
              <li><b>Histone modifications</b> — repressive <b>H3K27me3</b> vs active <b>H3K4me3 / H3K27ac</b> — shaping chromatin state and accessibility at these loci.</li>
              <li><b>Non-coding RNAs / miRNAs</b> repressing Na<sub>v</sub>1.5 post-transcriptionally.</li>
              <li><b>3D chromatin looping</b> bringing distal enhancers (e.g. SCN10A) to the SCN5A promoter.</li>
            </ul>
            <p>The promise: explaining <b>variable penetrance and phenotype variability</b>, and yielding <b>biomarkers</b> for precision risk stratification beyond SCN5A status.</p>
            <KeyBox kind="research" label="Your project">
              This is the frontier <b>WilliamsLab / BrS-EPI</b> targets — the central hypothesis that promoter/enhancer methylation, repressive histone remodeling and ncRNAs reduce Na<sub>v</sub>1.5-dependent I<sub>Na</sub> <i>independently of, and additively to,</i> SCN5A coding mutations. See the <Link to="/mechanism">Mechanism Map</Link> and <Link to="/hypotheses">Hypotheses</Link>.
            </KeyBox>
          </Sec>

          <Sec id="controversies" no="09" title="Open questions & controversies">
            <ul>
              <li><b>Depolarization vs repolarization</b> — one, the other, or a spectrum by patient?</li>
              <li><b>Genetic architecture</b> — is SCN5A causal or a modifier on a polygenic background?</li>
              <li><b>Is BrS structural?</b> — the RVOT-fibrosis / "concealed cardiomyopathy" debate.</li>
              <li><b>Risk stratification</b> — the value (and reproducibility) of EP study-induced VF.</li>
              <li><b>Epigenetics & penetrance</b> — do methylation/chromatin states explain why carriers diverge? (Open — your project's question.)</li>
            </ul>
          </Sec>
        </div>
      </div>
    </>
  )
}
