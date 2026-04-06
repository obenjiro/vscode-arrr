import * as path from 'path';

export function selectDeclaringModules(modulePaths: string[], selectedModulePath?: string): string[] {
  if (!selectedModulePath) {
    return modulePaths;
  }

  return modulePaths.filter((modulePath) => modulePath === selectedModulePath);
}

export function sortModulePathsByProximity(modulePaths: string[], sourceFilePath?: string): string[] {
  return [...modulePaths].sort((modulePathA, modulePathB) => {
    const sourceDirectory = path.dirname(sourceFilePath || "");
    const scoreB = getCommonPathDepth(sourceDirectory, path.dirname(modulePathB));
    const scoreA = getCommonPathDepth(sourceDirectory, path.dirname(modulePathA));

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    return modulePathA.localeCompare(modulePathB);
  });
}

function getCommonPathDepth(pathA: string, pathB: string): number {
  const partsA = path.resolve(pathA).split(path.sep).filter(Boolean);
  const partsB = path.resolve(pathB).split(path.sep).filter(Boolean);

  let depth = 0;
  while (depth < partsA.length && depth < partsB.length && partsA[depth] === partsB[depth]) {
    depth += 1;
  }

  return depth;
}
