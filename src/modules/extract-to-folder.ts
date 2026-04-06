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
import { getDeclarationChangeDescriptor } from "./module-declaration";
import { selectDeclaringModules, sortModulePathsByProximity } from "./module-selection";

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

        let fullPath;
        if (folderPath.indexOf(rootPath) > -1) {
          fullPath = path.join(folderPath, fileName);
        } else {
          fullPath = path.join(rootPath || '', folderPath, fileName);
        }

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

        const targetModulePaths = targetModuleDocuments.map((moduleDocument) => moduleDocument.fileName);
        const selectedModulePath = await getSelectedModulePath(targetModulePaths);

        if (targetModuleDocuments.length > 1 && !selectedModulePath) {
          return;
        }

        const selectedModulePaths = selectDeclaringModules(targetModulePaths, selectedModulePath);
        const selectedModuleDocuments = targetModuleDocuments.filter((moduleDocument) =>
          selectedModulePaths.includes(moduleDocument.fileName)
        );

        const changes = await Promise.all(
          selectedModuleDocuments.map((moduleDocument) => {
            const allText = moduleDocument.getText();
            const changeDescriptor = getDeclarationChangeDescriptor(
              allText,
              fileName
            );

            if (!changeDescriptor) {
              return null;
            }

            const start = moduleDocument.positionAt(changeDescriptor.startOffset);
            const end = moduleDocument.positionAt(changeDescriptor.endOffset);

            return replaceTextInFile(
              changeDescriptor.targetText,
              start,
              end,
              moduleDocument.fileName
            );
          })
        );

        await persistFileSystemChanges(
          ...changes.filter((change) => change !== null)
        );
        await Promise.all(
          selectedModuleDocuments.map((moduleDocument) => {
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


async function getSelectedModulePath(modulePaths: string[]): Promise<string | undefined> {
  if (modulePaths.length <= 1) {
    return modulePaths[0];
  }

  const sortedModulePaths = sortModulePathsByProximity(modulePaths, activeFileName());

  const selectedModule = await vscode.window.showQuickPick(
    sortedModulePaths.map((modulePath) => ({
      label: path.basename(modulePath),
      description: path.dirname(modulePath),
      modulePath,
    })),
    { placeHolder: 'Select the NgModule that should declare the extracted component' }
  );

  return selectedModule?.modulePath;
}
