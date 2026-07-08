import { useRef, type ReactNode } from 'react'
import { exportPngFile, exportSvgFile, exportPdfFile } from '../lib/figureExport'

// Wraps any figure whose markup contains an <svg> and offers a hover toolbar to
// export it as PNG, SVG, or PDF. The first <svg> inside is the export target.
export function FigureFrame({ name, children }: { name: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const svg = () => ref.current?.querySelector('svg') as SVGSVGElement | null
  const run = (fn: (s: SVGSVGElement, n: string) => void) => {
    const s = svg()
    if (s) fn(s, name)
  }
  return (
    <div className="fig-frame" ref={ref}>
      <div className="fig-tools">
        <button className="fig-btn" onClick={() => run(exportPngFile)} title="Download PNG">⤓ PNG</button>
        <button className="fig-btn" onClick={() => run(exportSvgFile)} title="Download SVG">SVG</button>
        <button className="fig-btn" onClick={() => run((s, n) => exportPdfFile(s, n))} title="Download PDF">PDF</button>
      </div>
      {children}
    </div>
  )
}
