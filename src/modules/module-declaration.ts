import {pascalCase} from 'change-case';

export function getDeclarationChangeDescriptor(allText: string, fileName: string) {
  const declarationsMatch = allText.match(/declarations\s*:\s*\[/);
  if (!declarationsMatch || declarationsMatch.index === undefined) {
    return null;
  }

  const declarationsText = declarationsMatch[0];
  const idx = declarationsMatch.index;

  return {
    startOffset: idx,
    endOffset: idx + declarationsText.length,
    targetText: `${declarationsText}\n    ${pascalCase(fileName)}Component,`,
  };
}
