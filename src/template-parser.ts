import * as ng from '@angular/compiler';

export const templateParser = {
  locationProps: new Set([
    'span',
    'sourceSpan',
    'startSourceSpan',
    'endSourceSpan',
  ]),
  typeProps: new Set(['name']),

  parse(code: string, options?: ng.ParseTemplateOptions) {
    const ast = ng.parseTemplate(code, 'astexplorer.html', options);
    fixSpan(ast, code);
    return ast;
  },

  nodeToRange(node: any) {
    if (node.startSourceSpan) {
      if (node.endSourceSpan) {
        return [
          node.startSourceSpan.start.offset,
          node.endSourceSpan.end.offset,
        ];
      }
      return [
        node.startSourceSpan.start.offset,
        node.startSourceSpan.end.offset,
      ];
    }
    if (node.sourceSpan) {
      return [node.sourceSpan.start.offset, node.sourceSpan.end.offset];
    }
    if (node.span) {
      return [node.span.start, node.span.end];
    }
  },

  getNodeName(node: { name: any }) {
    let name = getNodeCtor(node);
    if (node.name) {
      name += `(${node.name})`;
    }
    return name;
  },

  getDefaultOptions() {
    return {
      preserveWhitespaces: false,
    };
  },
};

export function getNodeCtor(node: {
  name?: any;
  sourceSpan?: { start: { offset: any } };
  constructor?: any;
}) {
  return node.constructor && node.constructor.name;
}

/**
 * Locations from sub AST are counted from that part of string,
 * we need to fix them to make autofocus work.
 *
 * Before:
 *
 *     <tag [attr]="expression">
 *                  ^^^^^^^^^^ sub AST { start: 0, end: 10 }
 *
 * After:
 *
 *     <tag [attr]="expression">
 *                  ^^^^^^^^^^ sub AST { start: 13, end: 23 }
 */
function fixSpan(ast: any, code: string) {
  function getBaseStart(parent: { sourceSpan: { start: { offset: any } } }) {
    const nodeName = getNodeCtor(parent);
    switch (nodeName) {
      case 'BoundAttribute':
      case 'BoundEvent': {
        let offset = parent.sourceSpan.start.offset;
        while (code[offset++] !== '=') {}
        if (code[offset] === "'" || code[offset] === '"') {
          offset++;
        }
        return offset;
      }
      case 'BoundText':
        return parent.sourceSpan.start.offset;
      default:
        throw new Error(`Unexpected node ${nodeName}`);
    }
  }

  visitTarget(
    ast,
    (value: any) => getNodeCtor(value) === 'ASTWithSource',
    (node: any, parent: any) => {
      const baseStart = getBaseStart(parent);
      visitTarget(
        node,
        (value: any) => value.span,
        (node: any) => {
          node.span.start += baseStart;
          node.span.end += baseStart;
          return KEEP_VISIT;
        }
      );
    }
  );
}

export const KEEP_VISIT = 1;

export function visitTarget(
  value: any,
  isTarget: Function,
  fn: Function,
  parent?: any
) {
  if (value !== null && typeof value === 'object') {
    if (isTarget(value)) {
      if (fn(value, parent) !== KEEP_VISIT) {
        return;
      }
    }
    if (Array.isArray(value)) {
      value.forEach((subValue) => visitTarget(subValue, isTarget, fn, value));
    } else {
      for (const key in value) {
        visitTarget(value[key], isTarget, fn, value);
      }
    }
  }
}

export function getAllTargets(text) {
  const output = templateParser.parse(text);
  const ast = output.nodes;
  const targets: string[] = [];

  visitTarget(
    ast,
    (value: any) => {
      return (
        (getNodeCtor(value) === "PropertyRead" &&
          getNodeCtor(value.receiver) === "ImplicitReceiver") ||
        (getNodeCtor(value) === "MethodCall" &&
          getNodeCtor(value.receiver) === "ImplicitReceiver")
      );
    },
    (node: any, parent: any) => {
      targets.push(node.name);
      return KEEP_VISIT;
    }
  );

  // removing variables refrences
  visitTarget(
    ast,
    (value: any) => {
      return getNodeCtor(value) === "Variable";
    },
    (node: any, parent: any) => {
      if (targets.indexOf(node.name) > -1) {
        targets.splice(targets.indexOf(node.name));
      }
      return KEEP_VISIT;
    }
  );

  return [...new Set(targets)];
}