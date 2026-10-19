import React from "react";

/** Minimal markdown for lesson bodies: ## / ### headings, paragraphs, - and 1. lists, | tables |, **bold**, *italic*, `code`. */

function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const k = `${key}-${i++}`;
    if (token.startsWith("**")) out.push(<strong key={k} className="text-white font-bold">{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) out.push(<code key={k} className="break-all bg-white/10 px-1 text-[0.85em] text-myco-accent">{token.slice(1, -1)}</code>);
    else out.push(<em key={k}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function tableRows(lines: string[]): string[][] {
  return lines
    .filter((l) => !/^\|\s*-/.test(l))
    .map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
}

export function LessonMarkdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `b${i}`;
    if (!line.trim()) {
      i++;
    } else if (line.startsWith("### ")) {
      blocks.push(<h4 key={key} className="pt-2 text-base font-black uppercase tracking-wide text-white">{inline(line.slice(4), key)}</h4>);
      i++;
    } else if (line.startsWith("## ")) {
      blocks.push(<h3 key={key} className="pt-4 text-lg md:text-xl font-black uppercase tracking-tight text-white">{inline(line.slice(3), key)}</h3>);
      i++;
    } else if (line.startsWith("|")) {
      const group: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) group.push(lines[i++]);
      const [head, ...rows] = tableRows(group);
      blocks.push(
        <div key={key} className="overflow-x-auto">
          <table className="min-w-[480px] w-full border border-white/10 text-sm">
            <thead>
              <tr>{head.map((c, j) => <th key={j} className="border-b border-white/10 bg-white/5 px-3 py-2 text-left text-[11px] uppercase tracking-widest text-white/60">{inline(c, `${key}h${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-white/5">
                  {r.map((c, j) => <td key={j} className="px-3 py-2 align-top text-white/80">{inline(c, `${key}r${ri}c${j}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (/^(\d+\.|-)\s/.test(line)) {
      const ordered = /^\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^(\d+\.|-)\s/.test(lines[i])) {
        items.push(lines[i].replace(/^(\d+\.|-)\s+/, ""));
        i++;
        while (i < lines.length && /^\s{2,}(\d+\.|-)\s/.test(lines[i])) items[items.length - 1] += `\n${lines[i++].trim()}`;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={key} className={`${ordered ? "list-decimal" : "list-disc"} space-y-1.5 pl-5 text-white/80 marker:text-myco-accent`}>
          {items.map((item, j) => (
            <li key={j}>
              {item.split("\n").map((part, p) => (
                <span key={p} className={p ? "block pl-3 text-white/70" : undefined}>{inline(part.replace(/^(\d+\.|-)\s+/, p ? "• " : ""), `${key}l${j}p${p}`)}</span>
              ))}
            </li>
          ))}
        </List>,
      );
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#{2,3} |\||\d+\.\s|-\s)/.test(lines[i])) para.push(lines[i++]);
      blocks.push(<p key={key} className="text-white/80 leading-relaxed">{inline(para.join(" "), key)}</p>);
    }
  }
  return <div className="space-y-4 text-sm md:text-base">{blocks}</div>;
}
