import {pascalCase} from 'change-case';

export function getDeclarationChangeDescriptor(allText: string, fileName: string) {
  const declarationsMatch = allText.match(/declarations\s*:\s*\[/);
  if (!declarationsMatch || declarationsMatch.index === undefined) {
    return null;
  }

  const declarationsText = declarationsMatch[0];
  const declarationStartIdx = declarationsMatch.index;
  const declarationEndIdx = declarationStartIdx + declarationsText.length;
  const componentName = `${pascalCase(fileName)}Component`;
  const targetModuleNameMatch = allText.match(/export\s+class\s+(\w+)/);
  const targetModuleName = targetModuleNameMatch ? targetModuleNameMatch[1] : '';

  const output = {
    startOffset: declarationStartIdx,
    endOffset: declarationEndIdx,
    targetText: `${declarationsText}\n    ${componentName},`,
  };

  if (targetModuleName === 'AppModule') {
    return output;
  }

  const exportsMatch = allText.match(/exports\s*:\s*\[/);
  if (!exportsMatch || exportsMatch.index === undefined) {
    return output;
  }

  if (exportsMatch.index < declarationEndIdx) {
    return output;
  }

  const declarationsToExportsSpan = allText.slice(declarationEndIdx, exportsMatch.index);

  return {
    startOffset: declarationStartIdx,
    endOffset: exportsMatch.index + exportsMatch[0].length,
    targetText: `${declarationsText}\n    ${componentName},${declarationsToExportsSpan}${exportsMatch[0]}\n    ${componentName},`,
  };
}
