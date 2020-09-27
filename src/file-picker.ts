import {
  convertRelativeToFullPath,
  showInputBox
} from './editor';
import * as vscode from 'vscode';

export function promptFileNameInput(directory) {
  return showInputBox(directory, 'Filename or relative path to a file').then(
    convertRelativeToFullPath as any
  );
}

const NEW_FILE_OPTION: string = 'Enter Folder Name';

export function showFilePicker() {
  return (
    vscode.window
      .showInputBox({
        placeHolder: NEW_FILE_OPTION
      })
      .then(cancelActionIfNeeded)
  );
}

const cancelActionIfNeeded = (value: any) =>
  value ? value : Promise.reject(false);
