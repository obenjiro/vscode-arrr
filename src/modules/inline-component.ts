export type InlineMode = 'selected' | 'all';

export interface InlineTemplateParams {
  parentTemplate: string;
  childSelector: string;
  childTemplate: string;
  selectionStart: number;
  selectionEnd: number;
  mode: InlineMode;
}

export interface InlineTemplateResult {
  template: string;
  replacedCount: number;
}

interface TagMatch {
  start: number;
  end: number;
  attrs: string;
  content: string;
}

export function inlineChildComponentTemplate(params: InlineTemplateParams): InlineTemplateResult {
  const matches = findTagMatches(params.parentTemplate, params.childSelector);
  if (!matches.length) {
    return { template: params.parentTemplate, replacedCount: 0 };
  }

  const selectedMatches = params.mode === 'all'
    ? matches
    : matches.filter((match) => rangesOverlap(match.start, match.end, params.selectionStart, params.selectionEnd));

  if (!selectedMatches.length) {
    return { template: params.parentTemplate, replacedCount: 0 };
  }

  let nextTemplate = params.parentTemplate;
  [...selectedMatches]
    .sort((a, b) => b.start - a.start)
    .forEach((match) => {
      const inlined = renderInlinedTemplate(params.childTemplate, match.attrs, match.content);
      nextTemplate = `${nextTemplate.slice(0, match.start)}${inlined}${nextTemplate.slice(match.end)}`;
    });

  return {
    template: nextTemplate,
    replacedCount: selectedMatches.length,
  };
}

function renderInlinedTemplate(childTemplate: string, attrs: string, projectedContent: string): string {
  const attrBindings = parseAttributeBindings(attrs);
  let rendered = childTemplate;

  Object.keys(attrBindings).forEach((key) => {
    const value = attrBindings[key];
    rendered = rendered.replace(new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, 'g'), `{{${value}}}`);
  });

  return rendered.replace(/<ng-content\b[^>]*><\/ng-content>|<ng-content\b[^>]*\/>/g, projectedContent);
}

function parseAttributeBindings(attrs: string): Record<string, string> {
  const bindings: Record<string, string> = {};
  const attrRegex = /(\[\([\w-]+\)\]|\[[\w-]+\]|bind-[\w-]+|[\w-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null = attrRegex.exec(attrs);
  while (match) {
    const rawName = match[1];
    const rawValue = match[3] !== undefined ? match[3] : match[4] || '';
    const cleanName = normalizeBindingName(rawName);
    if (cleanName) {
      bindings[cleanName] = rawValue;
    }
    match = attrRegex.exec(attrs);
  }

  return bindings;
}

function normalizeBindingName(rawName: string): string {
  if (rawName.startsWith('[(') && rawName.endsWith(')]')) {
    return rawName.slice(2, -2);
  }
  if (rawName.startsWith('[') && rawName.endsWith(']')) {
    return rawName.slice(1, -1);
  }
  if (rawName.startsWith('bind-')) {
    return rawName.slice(5);
  }
  return rawName;
}

function findTagMatches(template: string, selector: string): TagMatch[] {
  const escapedSelector = escapeRegExp(selector);
  const pairRegex = new RegExp(`<${escapedSelector}(\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedSelector}>`, 'g');
  const selfClosingRegex = new RegExp(`<${escapedSelector}(\\s[^>]*)?\\s*\\/>`, 'g');

  const matches: TagMatch[] = [];

  let pairedMatch = pairRegex.exec(template);
  while (pairedMatch) {
    matches.push({
      start: pairedMatch.index,
      end: pairedMatch.index + pairedMatch[0].length,
      attrs: pairedMatch[1] || '',
      content: pairedMatch[2] || '',
    });
    pairedMatch = pairRegex.exec(template);
  }

  let selfMatch = selfClosingRegex.exec(template);
  while (selfMatch) {
    matches.push({
      start: selfMatch.index,
      end: selfMatch.index + selfMatch[0].length,
      attrs: selfMatch[1] || '',
      content: '',
    });
    selfMatch = selfClosingRegex.exec(template);
  }

  return matches.sort((a, b) => a.start - b.start);
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
