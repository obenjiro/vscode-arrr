// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import {extractToFolder} from './modules/extract-to-folder';
import {templateParser} from './template-parser';
import {getSelectedText} from './editor';

export class CompleteActionProvider implements vscode.CodeActionProvider {
  public provideCodeActions(): vscode.ProviderResult<vscode.Command[]> {
    const text = getSelectedText();

    // try parse text with parser
    if (text) {
      try {
        const output = templateParser.parse(text);
        if (!output.errors) {
          return [
            {
              command: 'extension.arrr.extract-to-folder',
              title: 'Extract Angular Component',
            },
          ];
        }
      } catch (err) {
      }
    }

    return [];
  }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'extension.arrr.extract-to-folder',
      extractToFolder
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      {pattern: '**/*.*'},
      new CompleteActionProvider()
    )
  );
}

// this method is called when your extension is deactivated
export function deactivate() {
}
