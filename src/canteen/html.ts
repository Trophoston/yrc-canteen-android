const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&([^;]+);/g, (match, entity) => {
    if (ENTITY_MAP[entity]) {
      return ENTITY_MAP[entity];
    }
    if (entity.startsWith('#x')) {
      const code = Number.parseInt(entity.slice(2), 16);
      return String.fromCharCode(code);
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10);
      return String.fromCharCode(code);
    }
    return match;
  });
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, '');
}

export function extractTextByClass(html: string, tag: string, classKeywords: string[]): string | null {
  const regex = new RegExp(`<${tag}[^>]*class=\"([^\"]*)\"[^>]*>([\\s\\S]*?)<\/${tag}>`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const className = match[1];
    if (classKeywords.every((keyword) => className.split(/\s+/).includes(keyword))) {
      const inner = stripTags(match[2]).trim();
      if (inner) {
        return decodeHtmlEntities(inner);
      }
    }
  }
  return null;
}

export function extractFirstSpan(html: string): string | null {
  const match = /<span[^>]*>([\s\S]*?)<\/span>/i.exec(html);
  if (!match) {
    return null;
  }
  const inner = stripTags(match[1]).trim();
  return inner ? decodeHtmlEntities(inner) : null;
}

export function extractFormInputs(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /<input[^>]*name=['\"]([^'\"]+)['\"][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const tag = match[0];
    const name = match[1];
    const typeMatch = tag.match(/type=['\"]([^'\"]*)['\"]/i);
    const type = typeMatch ? typeMatch[1].toLowerCase() : 'text';
    if (type === 'submit' || type === 'button' || type === 'reset') {
      continue;
    }
    if ((type === 'radio' || type === 'checkbox') && !/checked/i.test(tag)) {
      continue;
    }
    const valueMatch = tag.match(/value=['\"]([^'\"]*)['\"]/i);
    result[name] = valueMatch ? decodeHtmlEntities(valueMatch[1]) : 'on';
  }
  return result;
}

export function extractFormAction(html: string): string | null {
  const match = /<form[^>]*action=['\"]([^'\"]*)['\"]/i.exec(html);
  return match ? match[1] : null;
}

export function findSection(html: string, classKeyword: string): string | null {
  const regex = new RegExp(`<div[^>]*class=\"[^\"]*${classKeyword}[^\"]*\"[^>]*>([\\s\\S]*?)<\/div>`, 'i');
  const match = regex.exec(html);
  if (!match) {
    return null;
  }
  return match[1];
}

export function hasText(html: string, needle: string): boolean {
  return html.toLowerCase().includes(needle.toLowerCase());
}
