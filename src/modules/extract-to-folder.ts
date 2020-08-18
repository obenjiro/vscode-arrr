import * as vscode from "vscode";
import {activeFileName, getSelectedText, getSelectionOffsetRange, importMissingDependencies,} from "../editor";
import {getAllTargets,} from "../template-parser";
import {showFilePicker} from "../file-picker";
import {createFileIfDoesntExist, persistFileSystemChanges, replaceTextInFile,} from "../file-system";
import {pascalCase} from "change-case";
import {appendSelectedTextToFile, replaceSelectionWith,} from "../code-actions";
import {showDirectoryPicker} from "../directories-picker";
import {getComponentInstance, getComponentText, getSpecText,} from "./extract-to-folder-template";

const fs = require("fs");
const path = require("path");

export async function extractToFolder() {
  const {start, end} = getSelectionOffsetRange();

  if (start && end) {
    try {
      const text = getSelectedText() || "";
      const sourceComponentName = await getComponentNameFromHtmlFile(
        activeFileName()
      );

      const targets = getAllTargets(text);

      try {
        const folderPath = await showDirectoryPicker();
        const filePath = (await showFilePicker(folderPath)) as string;

        const parts = filePath.split("/");

        const componentName = parts[parts.length - 1];


        const htmlFilePath = `${filePath}/${componentName}.component.html`;
        const cssFilePath = `${filePath}/${componentName}.component.css`;
        const tsFilePath = `${filePath}/${componentName}.component.ts`;
        const specFilePath = `${filePath}/${componentName}.component.spec.ts`;

        await createFileIfDoesntExist(htmlFilePath);
        await createFileIfDoesntExist(cssFilePath);
        await createFileIfDoesntExist(tsFilePath);
        await createFileIfDoesntExist(specFilePath);

        await appendSelectedTextToFile({text}, htmlFilePath);
        await appendSelectedTextToFile({text: ``}, cssFilePath);
        await appendSelectedTextToFile(
          {text: getComponentText(componentName, targets)},
          tsFilePath
        );
        await appendSelectedTextToFile(
          {text: getSpecText(componentName)},
          specFilePath
        );

        const componentInstance = getComponentInstance(componentName, targets);
        await persistFileSystemChanges(replaceSelectionWith(componentInstance));

        const moduleUris = await vscode.workspace.findFiles(
          "**/*.module.ts",
          "**/node_modules/**"
        );
        const moduleDocuments = await Promise.all(
          moduleUris.map((uri) => vscode.workspace.openTextDocument(uri))
        );

        const targetModuleDocuments = moduleDocuments.filter(
          (moduleDocument) => {
            const allText = moduleDocument.getText();
            return new RegExp(`\\b${sourceComponentName}\\b`).test(allText);
          }
        );

        const changes = await Promise.all(
          targetModuleDocuments.map((moduleDocument) => {
            const allText = moduleDocument.getText();
            const matches = allText.match(/declarations\s*:\s*\[/) || [];

            const idx = matches.index || 0;
            const startOffset = idx;
            const endOffset = idx + matches[0].length;

            const start = moduleDocument.positionAt(startOffset);
            const end = moduleDocument.positionAt(endOffset);
            const targetText = `${matches[0]}\n    ${pascalCase(
              componentName
            )}Component,`;

            return replaceTextInFile(
              targetText,
              start,
              end,
              moduleDocument.fileName
            );
          })
        );

        await persistFileSystemChanges(...changes);
        await Promise.all(
          targetModuleDocuments.map((moduleDocument) => {
            return importMissingDependencies(moduleDocument.fileName);
          })
        );
      } catch (e) {
        vscode.window.showErrorMessage(e.message);
      }
    } catch (err) {
      console.error(err);
    }
  }
}

async function getComponentNameFromHtmlFile(filePath) {
  const name = path.basename(filePath);
  const dir = path.dirname(filePath);

  const tsPath = path.join(dir, name.replace(".html", ".ts"));
  const tsContent = fs.readFileSync(tsPath, "utf-8");

  return (tsContent.match(/export class\s+([\w_]+)/) || [])[1];
}

