import * as vscode from 'vscode';
import {QuickPickItem} from 'vscode';
import * as path from 'path';

export const workspaceRoot = () => vscode.workspace.rootPath as string;

export const activeURI = () =>
  vscode.window.activeTextEditor?.document.uri as vscode.Uri;
export const activeFileName = () =>
  vscode.window.activeTextEditor?.document.fileName;

export const selectedTextStart = () =>
  vscode.window.activeTextEditor?.selection.start;
export const selectedTextEnd = () =>
  vscode.window.activeTextEditor?.selection.end;

export const config = () => vscode.workspace.getConfiguration('arrr');

export function currentEditorPath(): string {
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const currentFilePath = path.dirname(activeEditor.document.fileName);
    const rootMatcher = new RegExp(`^${workspaceRoot()}`);
    return currentFilePath.replace(rootMatcher, '');
  }
  return '';
}

export function openFile(absolutePath: string): PromiseLike<string> {
  return vscode.workspace
    .openTextDocument(absolutePath)
    .then((textDocument) => {
      if (textDocument) {
        vscode.window.showTextDocument(textDocument);
        return absolutePath;
      } else {
        throw Error('Could not open document');
      }
    });
}

export function getSelectedText() {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const selection = editor.selection;
    return editor.document.getText(selection);
  } else {
    return null;
  }
}

export function getSelectionOffsetRange() {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    return {
      start: editor.document.offsetAt(editor.selection.start),
      end: editor.document.offsetAt(editor.selection.end),
    };
  } else {
    return {};
  }
}

export function showInputBox(defaultValue: string, placeHolder: string) {
  return vscode.window.showInputBox({
    value: defaultValue,
    placeHolder,
  });
}

export function showQuickPicksList(choices: QuickPickItem[], placeHolder = '') {
  // return vscode.window.showInputBox();
  return vscode.window.showQuickPick<vscode.QuickPickItem>(choices, {
    placeHolder,
  });
}

export const convertRelativeToFullPath = (relativePath: string) => {
  const root = workspaceRoot();
  return root ? path.join(root, relativePath) : relativePath;
};

export const extractQuickPickValue = (selection: any) => {
  if (!selection) {
    return;
  }
  return selection.label;
};

export const toQuickPick = (label: string, description?: string) => ({
  label,
  description,
});

export const toQuickPicksList = (choices: string[]) =>
  choices.map((item) => toQuickPick(item));

export const showErrorMessage = (message: string) =>
  vscode.window.showErrorMessage(message);

export const importMissingDependencies = (targetFile: string) =>
  vscode.commands.executeCommand(
    '_typescript.applyFixAllCodeAction',
    targetFile,
    {fixId: 'fixMissingImport'}
  );
