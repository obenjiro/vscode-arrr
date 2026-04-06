import * as assert from 'assert';
import * as vscode from 'vscode';
import {CompleteActionProvider} from '../../extension';

async function withSelectedText<T>(text: string, fn: () => T | Promise<T>) {
  const document = await vscode.workspace.openTextDocument({
    language: 'html',
    content: text,
  });

  const editor = await vscode.window.showTextDocument(document);
  const start = new vscode.Position(0, 0);
  const lastLine = document.lineAt(document.lineCount - 1);
  const end = lastLine.range.end;
  editor.selection = new vscode.Selection(start, end);

  return fn();
}

suite('CompleteActionProvider', function () {
  this.timeout(20000);
  const provider = new CompleteActionProvider();

  test('returns extract action for valid Angular template snippets', async () => {
    await withSelectedText('<div>{{title}}</div>', async () => {
      const result = provider.provideCodeActions() as vscode.Command[];

      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].command, 'extension.arrr.extract-to-folder');
    });
  });

  test('returns extract action for malformed-but-parseable snippets', async () => {
    await withSelectedText('<div>{{', async () => {
      const result = provider.provideCodeActions() as vscode.Command[];

      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 1);
    });
  });

  test('returns no actions when nothing is selected', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'html',
      content: '<div>{{title}}</div>',
    });

    const editor = await vscode.window.showTextDocument(document);
    const cursor = new vscode.Position(0, 0);
    editor.selection = new vscode.Selection(cursor, cursor);

    const result = provider.provideCodeActions() as vscode.Command[];

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });
});
