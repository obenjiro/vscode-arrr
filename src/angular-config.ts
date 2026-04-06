import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedComponentOptions {
  styleExt: string;
  skipTests: boolean;
}

interface AngularSchematicsOptions {
  style?: string;
  skipTests?: boolean;
}

export function resolveGeneratedComponentOptions(
  workspaceRootPath: string | undefined,
  sourceStyleExt: string,
  sourceFilePath?: string
): GeneratedComponentOptions {
  const defaults: GeneratedComponentOptions = {
    styleExt: sourceStyleExt || 'css',
    skipTests: false,
  };

  if (!workspaceRootPath) {
    return defaults;
  }

  const angularJsonPath = path.join(workspaceRootPath, 'angular.json');
  if (!fs.existsSync(angularJsonPath)) {
    return defaults;
  }

  try {
    const angularConfig = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));

    const workspaceOptions = getComponentSchematicsOptions(angularConfig.schematics);
    const projectOptions = getProjectComponentSchematicsOptions(
      angularConfig.projects,
      workspaceRootPath,
      sourceFilePath
    );

    const merged = {
      ...workspaceOptions,
      ...projectOptions,
    };

    return {
      styleExt: normalizeStyleExtension(merged.style, defaults.styleExt),
      skipTests: typeof merged.skipTests === 'boolean' ? merged.skipTests : defaults.skipTests,
    };
  } catch (err) {
    return defaults;
  }
}

function getProjectComponentSchematicsOptions(
  projects: any,
  workspaceRootPath: string,
  sourceFilePath?: string
): AngularSchematicsOptions {
  if (!projects || typeof projects !== 'object') {
    return {};
  }

  const projectEntries = Object.entries(projects) as Array<[string, any]>;
  const matched = sourceFilePath
    ? projectEntries.find(([, project]) => {
        const projectRoot = path.resolve(workspaceRootPath, project.root || '');
        return sourceFilePath.startsWith(projectRoot);
      })
    : undefined;

  if (matched) {
    return getComponentSchematicsOptions(matched[1].schematics);
  }

  for (const [, project] of projectEntries) {
    const options = getComponentSchematicsOptions(project.schematics);
    if (Object.keys(options).length > 0) {
      return options;
    }
  }

  return {};
}

function getComponentSchematicsOptions(schematics: any): AngularSchematicsOptions {
  if (!schematics || typeof schematics !== 'object') {
    return {};
  }

  if (schematics['@schematics/angular:component']) {
    return schematics['@schematics/angular:component'];
  }

  const componentKey = Object.keys(schematics).find((key) => key.endsWith(':component'));
  if (!componentKey) {
    return {};
  }

  return schematics[componentKey];
}

function normalizeStyleExtension(style: string | undefined, fallback: string): string {
  if (!style || style === 'none') {
    return fallback;
  }

  return style.replace(/^\./, '');
}
