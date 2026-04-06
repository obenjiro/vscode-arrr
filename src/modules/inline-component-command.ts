import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { activeFileName, getSelectionOffsetRange } from '../editor';
import { inlineChildComponentTemplate, InlineMode } from './inline-component';

export async function inlineComponentIntoCurrentComponent() {
  const editor = vscode.window.activeTextEditor;
  const fileName = activeFileName();

  if (!editor || !fileName || !fileName.endsWith('.html')) {
    vscode.window.showErrorMessage('Inline Component requires an active Angular template (.html) file.');
    return;
  }

  const templateText = editor.document.getText();
  const { start, end } = getSelectionOffsetRange() as { start: number; end: number };
  const selectedText = templateText.slice(start, end);
  const selector = readFirstTagName(selectedText);

  if (!selector || !selector.includes('-')) {
    vscode.window.showErrorMessage('Please select a component usage tag (for example: <app-button>).');
    return;
  }

  const inlineMode = await askInlineMode();
  if (!inlineMode) {
    return;
  }

  const childSource = await findComponentSourceBySelector(selector);
  if (!childSource) {
    vscode.window.showErrorMessage(`Could not find component class for selector '${selector}'.`);
    return;
  }

  const childTemplate = loadComponentTemplate(childSource.tsPath, childSource.tsText);
  if (!childTemplate) {
    vscode.window.showErrorMessage('Could not resolve child component template to inline.');
    return;
  }

  const inlineResult = inlineChildComponentTemplate({
    parentTemplate: templateText,
    childSelector: selector,
    childTemplate,
    selectionStart: start,
    selectionEnd: end,
    mode: inlineMode,
  });

  if (!inlineResult.replacedCount) {
    vscode.window.showErrorMessage('No matching component usages were found at the current selection.');
    return;
  }

  const wholeRange = new vscode.Range(
    editor.document.positionAt(0),
    editor.document.positionAt(templateText.length)
  );

  await editor.edit((builder) => {
    builder.replace(wholeRange, inlineResult.template);
  });

  const parentTsPath = fileName.replace(/\.html$/, '.ts');
  if (inlineMode === 'all') {
    const hasRemainingUsages = new RegExp(`<${escapeRegExp(selector)}\\b`).test(inlineResult.template);
    if (!hasRemainingUsages) {
      await removeParentImport(parentTsPath, childSource.componentClassName);
      await deleteComponentFilesIfUnused(selector, childSource.tsPath);
    }
  }

  vscode.window.showInformationMessage(`Inlined ${inlineResult.replacedCount} ${selector} usage(s).`);
}

async function askInlineMode(): Promise<InlineMode | undefined> {
  const selection = await vscode.window.showQuickPick(
    [
      { label: 'Inline selected usage', value: 'selected' as InlineMode },
      { label: 'Inline all usages in current file', value: 'all' as InlineMode },
    ],
    { placeHolder: 'Inline only selected usage or all usages in this component?' }
  );

  return selection?.value;
}

function readFirstTagName(selection: string): string | null {
  const match = selection.match(/<\s*([a-zA-Z][\w-]*)\b/);
  return match ? match[1] : null;
}

async function findComponentSourceBySelector(selector: string): Promise<{ tsPath: string; tsText: string; componentClassName: string } | null> {
  const candidateUris = await vscode.workspace.findFiles('**/*.component.ts', '**/node_modules/**');

  for (const uri of candidateUris) {
    const tsPath = uri.fsPath;
    const tsText = fs.readFileSync(tsPath, 'utf-8');
    const selectorMatch = tsText.match(/selector\s*:\s*['"`]([^'"`]+)['"`]/);
    if (!selectorMatch || selectorMatch[1] !== selector) {
      continue;
    }

    const classMatch = tsText.match(/export\s+class\s+([\w_]+)/);
    return {
      tsPath,
      tsText,
      componentClassName: classMatch ? classMatch[1] : '',
    };
  }

  return null;
}

function loadComponentTemplate(tsPath: string, tsText: string): string | null {
  const inlineTemplateMatch = tsText.match(/template\s*:\s*`([\s\S]*?)`\s*,/);
  if (inlineTemplateMatch) {
    return inlineTemplateMatch[1];
  }

  const templateUrlMatch = tsText.match(/templateUrl\s*:\s*['"]([^'"]+)['"]/);
  if (!templateUrlMatch) {
    return null;
  }

  const templatePath = path.resolve(path.dirname(tsPath), templateUrlMatch[1]);
  if (!fs.existsSync(templatePath)) {
    return null;
  }

  return fs.readFileSync(templatePath, 'utf-8');
}

async function removeParentImport(parentTsPath: string, componentClassName: string): Promise<void> {
  if (!componentClassName || !fs.existsSync(parentTsPath)) {
    return;
  }

  const source = fs.readFileSync(parentTsPath, 'utf-8');
  const next = source
    .replace(new RegExp(`^.*\\b${escapeRegExp(componentClassName)}\\b.*\\n?`, 'gm'), (line) => {
      if (line.includes('import') || line.includes('imports:') || line.includes('declarations:')) {
        return '';
      }
      return line;
    })
    .replace(/imports\s*:\s*\[\s*,/g, 'imports: [')
    .replace(/declarations\s*:\s*\[\s*,/g, 'declarations: [');

  if (next !== source) {
    fs.writeFileSync(parentTsPath, next, 'utf-8');
  }
}

async function deleteComponentFilesIfUnused(selector: string, componentTsPath: string): Promise<void> {
  const htmlUris = await vscode.workspace.findFiles('**/*.html', '**/node_modules/**');
  const usageRegex = new RegExp(`<${escapeRegExp(selector)}\\b`);

  for (const uri of htmlUris) {
    const htmlText = fs.readFileSync(uri.fsPath, 'utf-8');
    if (usageRegex.test(htmlText)) {
      return;
    }
  }

  const basePath = componentTsPath.replace(/\.component\.ts$/, '.component');
  const candidateFiles = [
    `${basePath}.ts`,
    `${basePath}.html`,
    `${basePath}.css`,
    `${basePath}.scss`,
    `${basePath}.sass`,
    `${basePath}.less`,
    `${basePath}.spec.ts`,
  ];

  candidateFiles.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
