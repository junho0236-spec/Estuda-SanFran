import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Paragraph,
  Packer,
  TextRun,
  convertInchesToTwip,
} from 'docx';

type RunOpts = {
  bold?: boolean;
  italics?: boolean;
  underline?: object;
  strike?: boolean;
};

function unwrapEditorHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<div id="note-root">${html}</div>`, 'text/html');
  const root = doc.getElementById('note-root');
  if (!root) return html;
  root.querySelectorAll('[data-suggestion]').forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  });
  root.querySelectorAll('.ql-ui').forEach((el) => el.remove());
  return root.innerHTML;
}

function qlAlign(el: HTMLElement): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  if (el.classList.contains('ql-align-center')) return AlignmentType.CENTER;
  if (el.classList.contains('ql-align-right')) return AlignmentType.RIGHT;
  if (el.classList.contains('ql-align-justify')) return AlignmentType.JUSTIFIED;
  return undefined;
}

function collectInline(node: Node, inherited: RunOpts): (TextRun | ExternalHyperlink)[] {
  const out: (TextRun | ExternalHyperlink)[] = [];
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent ?? '';
    if (t.length) {
      out.push(
        new TextRun({
          text: t,
          bold: inherited.bold,
          italics: inherited.italics,
          underline: inherited.underline,
          strike: inherited.strike,
        })
      );
    }
    return out;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return out;
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (tag === 'br') {
    out.push(new TextRun({ break: 1 }));
    return out;
  }
  if (tag === 'a') {
    const href = el.getAttribute('href') || '';
    const label = el.textContent?.trim() || href;
    if (href && label) {
      out.push(
        new ExternalHyperlink({
          link: href,
          children: [new TextRun({ text: label, style: 'Hyperlink' })],
        })
      );
    } else {
      for (const c of el.childNodes) out.push(...collectInline(c, inherited));
    }
    return out;
  }
  const next: RunOpts = { ...inherited };
  if (tag === 'strong' || tag === 'b' || el.classList.contains('ql-bold')) next.bold = true;
  if (tag === 'em' || tag === 'i' || el.classList.contains('ql-italic')) next.italics = true;
  if (tag === 'u' || el.classList.contains('ql-underline')) next.underline = {};
  if (tag === 's' || tag === 'strike' || el.classList.contains('ql-strike')) next.strike = true;
  for (const c of el.childNodes) out.push(...collectInline(c, next));
  return out;
}

function blocksFromElement(
  el: Element,
  listRef: { bullet: string; ordered: string },
  listLevel: number
): Paragraph[] {
  const tag = el.tagName.toLowerCase();
  const paragraphs: Paragraph[] = [];

  if (tag === 'p') {
    const align = qlAlign(el as HTMLElement);
    const children = collectInline(el, {});
    paragraphs.push(
      new Paragraph({
        alignment: align,
        children: children.length ? children : [new TextRun({ text: '' })],
      })
    );
    return paragraphs;
  }

  if (tag === 'h1') {
    paragraphs.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: collectInline(el, {}) })
    );
    return paragraphs;
  }
  if (tag === 'h2') {
    paragraphs.push(
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: collectInline(el, {}) })
    );
    return paragraphs;
  }
  if (tag === 'h3') {
    paragraphs.push(
      new Paragraph({ heading: HeadingLevel.HEADING_3, children: collectInline(el, {}) })
    );
    return paragraphs;
  }
  if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
    paragraphs.push(
      new Paragraph({ heading: HeadingLevel.HEADING_4, children: collectInline(el, {}) })
    );
    return paragraphs;
  }

  if (tag === 'blockquote') {
    if (el.children.length) {
      for (const child of el.children) paragraphs.push(...blocksFromElement(child, listRef, listLevel));
    } else {
      paragraphs.push(
        new Paragraph({
          indent: { left: convertInchesToTwip(0.25) },
          children: collectInline(el, {}),
        })
      );
    }
    return paragraphs;
  }

  if (tag === 'pre' || (el as HTMLElement).classList.contains('ql-syntax')) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: el.textContent ?? '', font: 'Consolas' })],
      })
    );
    return paragraphs;
  }

  if (tag === 'ul' || tag === 'ol') {
    const defaultOrdered = tag === 'ol';
    for (const li of Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li')) {
      const liEl = li as HTMLElement;
      const dataList = liEl.getAttribute('data-list');
      const ordered = dataList === 'ordered' || (defaultOrdered && dataList !== 'bullet');
      const ref = ordered ? listRef.ordered : listRef.bullet;
      const runs: (TextRun | ExternalHyperlink)[] = [];
      for (const child of liEl.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const ct = (child as HTMLElement).tagName.toLowerCase();
          if (ct === 'ul' || ct === 'ol') {
            if (runs.length) {
              paragraphs.push(
                new Paragraph({
                  numbering: { reference: ref, level: Math.min(listLevel, 2) },
                  children: runs,
                })
              );
              runs.length = 0;
            }
            paragraphs.push(...blocksFromElement(child as Element, listRef, listLevel + 1));
            continue;
          }
        }
        runs.push(...collectInline(child, {}));
      }
      paragraphs.push(
        new Paragraph({
          numbering: { reference: ref, level: Math.min(listLevel, 2) },
          children: runs.length ? runs : [new TextRun({ text: '' })],
        })
      );
    }
    return paragraphs;
  }

  if (tag === 'div') {
    if (el.children.length) {
      for (const child of el.children) paragraphs.push(...blocksFromElement(child, listRef, listLevel));
    } else {
      const align = qlAlign(el as HTMLElement);
      const children = collectInline(el, {});
      if (children.length) paragraphs.push(new Paragraph({ alignment: align, children }));
    }
    return paragraphs;
  }

  return paragraphs;
}

export async function buildDocxBlobFromEditorHtml(html: string): Promise<Blob> {
  const clean = unwrapEditorHtml(html);
  const wrapper = new DOMParser().parseFromString(`<div id="x">${clean}</div>`, 'text/html');
  const root = wrapper.getElementById('x');
  const listRef = { bullet: 'note-bullets', ordered: 'note-numbered' };
  const children: Paragraph[] = [];
  if (root) {
    if (root.children.length) {
      for (const child of root.children) children.push(...blocksFromElement(child, listRef, 0));
    } else {
      const t = root.textContent?.trim() ?? '';
      children.push(new Paragraph({ children: [new TextRun({ text: t })] }));
    }
  }
  if (!children.length) {
    children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: listRef.bullet,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.2) },
                },
              },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: '◦',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.55), hanging: convertInchesToTwip(0.2) },
                },
              },
            },
            {
              level: 2,
              format: LevelFormat.BULLET,
              text: '▪',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.75), hanging: convertInchesToTwip(0.2) },
                },
              },
            },
          ],
        },
        {
          reference: listRef.ordered,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.2) },
                },
              },
            },
            {
              level: 1,
              format: LevelFormat.LOWER_LETTER,
              text: '%2.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.55), hanging: convertInchesToTwip(0.2) },
                },
              },
            },
            {
              level: 2,
              format: LevelFormat.LOWER_ROMAN,
              text: '%3.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.75), hanging: convertInchesToTwip(0.2) },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [{ properties: {}, children }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
