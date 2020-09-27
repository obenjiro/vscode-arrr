import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import {
  activeFileName,
  getSelectedText,
  getSelectionOffsetRange,
  importMissingDependencies,
  workspaceRoot,
} from "../editor";
import { getAllTargets } from "../template-parser";
import { showFilePicker } from "../file-picker";
import {
  createFileIfDoesntExist,
  persistFileSystemChanges,
  replaceTextInFile,
} from "../file-system";
import { pascalCase } from "change-case";
import {
  appendSelectedTextToFile,
  replaceSelectionWith,
} from "../code-actions";
import { showDirectoryPicker } from "../directories-picker";
import {
  getComponentInstance,
  getComponentText,
  getSpecText,
} from "./extract-to-folder-template";

export async function extractToFolder() {
  const { start, end } = getSelectionOffsetRange();

  if (start && end) {
    try {
      const text = getSelectedText() || "";
      const componentText = await getComponentTextFromHtmlFileName(
        activeFileName()
      );
      const targets = getAllTargets(text);
      const sourceComponentConfig = await getCurrentComponentConfig(componentText);

      try {
        const rootPath = workspaceRoot();
        const folderPath = await showDirectoryPicker();
        const fileName = (await showFilePicker()) as string;

        const fullPath = path.join(rootPath || '', folderPath, fileName);

        const htmlFilePath = `${fullPath}/${fileName}.component.html`;
        const cssFilePath = `${fullPath}/${fileName}.component.${sourceComponentConfig.styleExt}`;
        const tsFilePath = `${fullPath}/${fileName}.component.ts`;
        const specFilePath = `${fullPath}/${fileName}.component.spec.ts`;

        await createFileIfDoesntExist(htmlFilePath);
        await createFileIfDoesntExist(cssFilePath);
        await createFileIfDoesntExist(tsFilePath);
        await createFileIfDoesntExist(specFilePath);

        await appendSelectedTextToFile({ text }, htmlFilePath);
        await appendSelectedTextToFile({ text: `` }, cssFilePath);
        await appendSelectedTextToFile(
          { text: getComponentText(fileName, targets, sourceComponentConfig) },
          tsFilePath
        );
        await appendSelectedTextToFile(
          { text: getSpecText(fileName) },
          specFilePath
        );

        const componentInstance = getComponentInstance(fileName, targets);
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
            return new RegExp(`\\b${sourceComponentConfig.componentName}\\b`).test(allText);
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
              fileName
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

async function getComponentTextFromHtmlFileName(filePath): Promise<string> {
  const name = path.basename(filePath);
  const dir = path.dirname(filePath);

  const tsPath = path.join(dir, name.replace(".html", ".ts"));
  const tsContent = fs.readFileSync(tsPath, "utf-8");

  return tsContent;
}

async function getCurrentComponentConfig(componentText) {
  try {
    const ts = require('typescript');
    const node = ts.createSourceFile(
      'x.ts',
      componentText,
      ts.ScriptTarget.Latest // langugeVersion
    );

    let classDecl;
    node.forEachChild(child => {
      if (
        ts.SyntaxKind[child.kind] === 'ClassDeclaration' && 
        child.decorators[0].expression.expression.escapedText === 'Component'
      ) {
        classDecl = child;
      }
    });
    // const decoratorName = classDecl.decorators[0].expression.expression.escapedText;
    const decoratorParams = 
      classDecl.decorators[0].expression.arguments.reduce((acc, el) => {
        el.properties.forEach(
          prop => acc[prop.name.escapedText] = prop.initializer.elements ? prop.initializer.elements.map(e => e.text) : prop.initializer.text
        );
        return acc;
      }, {});

    const styleInline = Boolean(decoratorParams.style);

    return {
      componentName: classDecl.name.escapedText,
      styleInline,
      styleExt: styleInline ? 'css': trimChar(path.extname(decoratorParams.styleUrls[0] || 'fail.css'), '.')
    };

  } catch (e) {

    return {
      componentName: (componentText.match(/export class\s+([\w_]+)/) || [])[1],
      styleInline: false,
      styleExt: 'css'
    };

  }
}

function escapeRegExp(strToEscape) {
  // Escape special characters for use in a regular expression
  return strToEscape.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};

function trimChar(origString, charToTrim) {
  charToTrim = escapeRegExp(charToTrim);
  var regEx = new RegExp("^[" + charToTrim + "]+|[" + charToTrim + "]+$", "g");
  return origString.replace(regEx, "");
};