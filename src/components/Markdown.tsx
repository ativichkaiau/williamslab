import React from 'react'

// Minimal, dependency-free markdown → React. Handles headings, bold,
// italic, inline code, bullet/numbered lists, pipe tables, and
// paragraphs — enough for streamed study content and manuscript export.

function inline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[2] !== undefined) nodes.push(<strong key={`${keyBase}-${i++}`}>{m[2]}</strong>)
    else if (m[3] !== undefined) nodes.push(<em key={`${keyBase}-${i++}`}>{m[3]}</em>)
    else if (m[4] !== undefined) nodes.push(<code key={`${keyBase}-${i++}`} className="md-code">{m[4]}</code>)
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

const cells = (line: string) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
const isSep = (line: string) => /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-')

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let listItems: string[] | null = null
  let listType: 'ul' | 'ol' = 'ul'

  const flush = () => {
    if (listItems && listItems.length) {
      const items = listItems.map((it, i) => <li key={i}>{inline(it, `li-${blocks.length}-${i}`)}</li>)
      blocks.push(listType === 'ul' ? <ul key={blocks.length} className="md-ul">{items}</ul> : <ol key={blocks.length} className="md-ol">{items}</ol>)
    }
    listItems = null
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].replace(/\s+$/, '')
    const heading = /^\s*(#{1,6})\s+(.*)$/.exec(line)
    // pipe table: a header row followed by a separator row
    if (line.trim().startsWith('|') && idx + 1 < lines.length && isSep(lines[idx + 1])) {
      flush()
      const header = cells(line)
      const rows: string[][] = []
      let j = idx + 2
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        rows.push(cells(lines[j]))
        j++
      }
      blocks.push(
        <div key={blocks.length} className="md-table-wrap">
          <table className="md-table">
            <thead><tr>{header.map((h, i) => <th key={i}>{inline(h, `th-${idx}-${i}`)}</th>)}</tr></thead>
            <tbody>{rows.map((rw, ri) => <tr key={ri}>{rw.map((c, ci) => <td key={ci}>{inline(c, `td-${ri}-${ci}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      idx = j - 1
      continue
    }
    if (heading) {
      flush()
      const level = heading[1].length
      const Tag = (level <= 2 ? 'h4' : level === 3 ? 'h5' : 'h6') as keyof React.JSX.IntrinsicElements
      blocks.push(<Tag key={blocks.length} className="md-h">{inline(heading[2], `h-${idx}`)}</Tag>)
    } else if (/^\s*[-*]\s+/.test(line)) {
      if (listItems === null || listType !== 'ul') { flush(); listType = 'ul'; listItems = [] }
      listItems!.push(line.replace(/^\s*[-*]\s+(\[[ x]\]\s+)?/, ''))
    } else if (/^\s*\d+\.\s+/.test(line)) {
      if (listItems === null || listType !== 'ol') { flush(); listType = 'ol'; listItems = [] }
      listItems!.push(line.replace(/^\s*\d+\.\s+/, ''))
    } else if (line.trim() === '' || line.trim() === '---') {
      flush()
    } else {
      flush()
      blocks.push(<p key={blocks.length} className="md-p">{inline(line, `p-${idx}`)}</p>)
    }
  }
  flush()

  return <div className="md">{blocks}</div>
}
