import {
  convertRelativeToFullPath,
  showInputBox,
  workspaceRoot,
} from './editor';
import {createFileIfDoesntExist} from './file-system';
import * as vscode from 'vscode';

function completeToFullFilePath(file, folder) {
  if (file === NEW_FILE_OPTION) {
    return promptFileNameInput(folder).then(createFileIfDoesntExist as any);
  } else {
    const root = workspaceRoot();
    return `${root || ''}${folder}/${file}`;
  }
}

export function promptFileNameInput(directory) {
  return showInputBox(directory, 'Filename or relative path to a file').then(
    convertRelativeToFullPath as any
  );
}

const NEW_FILE_OPTION: string = 'Enter Folder Name';

export function showFilePicker(directory) {
  return (
    vscode.window
      .showInputBox()
      .then(cancelActionIfNeeded)
      .then((file) => completeToFullFilePath(file, directory))
  );
}

const cancelActionIfNeeded = (value: any) =>
  value ? value : Promise.reject(false);
