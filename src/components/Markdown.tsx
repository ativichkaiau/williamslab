import React from 'react'

// Minimal, dependency-free markdown → React. Handles headings, bold,
// italic, inline code, bullet/numbered lists, and paragraphs — enough
// for streamed study content. Builds React nodes (no dangerouslySetHTML).

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

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let listItems: string[] | null = null
  let listType: 'ul' | 'ol' = 'ul'

  const flush = () => {
    if (listItems && listItems.length) {
      const items = listItems.map((it, i) => <li key={i}>{inline(it, `li-${blocks.length}-${i}`)}</li>)
      blocks.push(
        listType === 'ul' ? (
          <ul key={blocks.length} className="md-ul">{items}</ul>
        ) : (
          <ol key={blocks.length} className="md-ol">{items}</ol>
        ),
      )
    }
    listItems = null
  }

  lines.forEach((raw, idx) => {
    const line = raw.replace(/\s+$/, '')
    const heading = /^\s*(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      const level = heading[1].length
      const Tag = (level <= 2 ? 'h4' : level === 3 ? 'h5' : 'h6') as keyof React.JSX.IntrinsicElements
      blocks.push(<Tag key={blocks.length} className="md-h">{inline(heading[2], `h-${idx}`)}</Tag>)
    } else if (/^\s*[-*]\s+/.test(line)) {
      if (listItems === null || listType !== 'ul') {
        flush()
        listType = 'ul'
        listItems = []
      }
      listItems!.push(line.replace(/^\s*[-*]\s+/, ''))
    } else if (/^\s*\d+\.\s+/.test(line)) {
      if (listItems === null || listType !== 'ol') {
        flush()
        listType = 'ol'
        listItems = []
      }
      listItems!.push(line.replace(/^\s*\d+\.\s+/, ''))
    } else if (line.trim() === '') {
      flush()
    } else {
      flush()
      blocks.push(<p key={blocks.length} className="md-p">{inline(line, `p-${idx}`)}</p>)
    }
  })
  flush()

  return <div className="md">{blocks}</div>
}
