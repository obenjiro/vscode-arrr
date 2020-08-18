import {activeFileName, openFile, selectedTextStart, selectedTextEnd, showErrorMessage} from "./editor";
// import { shouldSwitchToTarget } from "./settings";
import {
  replaceTextInFile,
  appendTextToFile,
  prependTextToFile,
  removeContentFromFileAtLineAndColumn
} from "./file-system";

export async function switchToDestinationFileIfRequired(destinationFilePath: any) {
  // if (shouldSwitchToTarget()) {
  if (false) {
    await openFile(destinationFilePath);
  }
}

export function replaceSelectionWith(text: string) {
  return replaceTextInFile(text, selectedTextStart() as any, selectedTextEnd() as any, activeFileName());
}

export const appendSelectedTextToFile = ({
                                           text: selection
                                         }, destinationPath) => {
  let text;
  text = selection;

  return appendTextToFile(`${text}`, destinationPath);
};
