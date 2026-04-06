import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Activation', () => {
  test('registers the refactor commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('extension.arrr.extract-to-folder'));
    assert.ok(commands.includes('extension.arrr.inline-component'));
  });

  test('extension can be resolved and activated', async () => {
    const extension = vscode.extensions.getExtension('obenjiro.arrr');
    assert.ok(extension);

    await extension?.activate();

    assert.strictEqual(extension?.isActive, true);
  });


  test('command is a safe no-op for empty selections', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'html',
      content: '<div>{{title}}</div>',
    });
    const editor = await vscode.window.showTextDocument(document);
    const cursor = new vscode.Position(0, 0);
    editor.selection = new vscode.Selection(cursor, cursor);

    await assert.doesNotReject(async () => {
      await vscode.commands.executeCommand('extension.arrr.extract-to-folder');
    });
  });
});
