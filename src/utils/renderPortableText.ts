type PortableTextSpan = {
  _type?: string;
  text?: string;
  marks?: string[];
};

type PortableTextMarkDef = {
  _key?: string;
  _type?: string;
  href?: string;
};

type PortableTextBlock = {
  _type?: string;
  style?: string;
  children?: PortableTextSpan[];
  markDefs?: PortableTextMarkDef[];
  url?: string;
  alt?: string;
  caption?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSpan(span: PortableTextSpan, markDefs: PortableTextMarkDef[]) {
  let html = escapeHtml(span.text ?? "").replaceAll("\n", "<br />");

  for (const mark of span.marks ?? []) {
    if (mark === "strong") html = `<strong>${html}</strong>`;
    else if (mark === "em") html = `<em>${html}</em>`;
    else if (mark === "underline") html = `<u>${html}</u>`;
    else if (mark === "strike-through") html = `<s>${html}</s>`;
    else if (mark === "code") html = `<code>${html}</code>`;
    else {
      const definition = markDefs.find((item) => item._key === mark);
      if (definition?._type === "link" && definition.href) {
        const href = escapeHtml(definition.href);
        const external = /^https?:\/\//i.test(definition.href);
        html = `<a href="${href}"${external ? ' target="_blank" rel="noreferrer"' : ""}>${html}</a>`;
      }
    }
  }

  return html;
}

function renderTextBlock(block: PortableTextBlock) {
  const content = (block.children ?? [])
    .map((span) => renderSpan(span, block.markDefs ?? []))
    .join("");

  switch (block.style) {
    case "h2":
      return `<h2>${content}</h2>`;
    case "h3":
      return `<h3>${content}</h3>`;
    case "blockquote":
      return `<blockquote>${content}</blockquote>`;
    default:
      return `<p>${content}</p>`;
  }
}

function renderExternalMedia(block: PortableTextBlock) {
  if (!block.url) return "";

  const url = escapeHtml(block.url);
  const alt = escapeHtml(block.alt ?? "");
  const caption = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : "";

  return `<figure class="journal-inline-media"><img src="${url}" alt="${alt}" loading="lazy" />${caption}</figure>`;
}

export function renderPortableText(value: unknown) {
  if (!Array.isArray(value)) return "";

  return (value as PortableTextBlock[])
    .map((block) => {
      if (block?._type === "block") return renderTextBlock(block);
      if (block?._type === "externalMedia") return renderExternalMedia(block);
      return "";
    })
    .join("");
}
