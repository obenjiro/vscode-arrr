import * as assert from 'assert';

import {
  selectDeclaringModules,
  sortModulePathsByProximity,
} from '../../modules/module-selection';

suite('module selection', () => {
  test('uses only selected module when a module is chosen from picker', () => {
    const modulePaths = [
      '/workspace/project/src/app/app.module.ts',
      '/workspace/project/src/app/shared/shared.module.ts',
    ];

    const selected = selectDeclaringModules(modulePaths, '/workspace/project/src/app/shared/shared.module.ts');

    assert.deepStrictEqual(selected, ['/workspace/project/src/app/shared/shared.module.ts']);
  });

  test('keeps current behavior when no module is selected', () => {
    const modulePaths = [
      '/workspace/project/src/app/app.module.ts',
      '/workspace/project/src/app/shared/shared.module.ts',
    ];

    const selected = selectDeclaringModules(modulePaths);

    assert.deepStrictEqual(selected, modulePaths);
  });

  test('sorts modules by proximity to the source component path', () => {
    const sourcePath = '/workspace/project/src/app/profile/profile.component.html';
    const modulePaths = [
      '/workspace/project/src/app/app.module.ts',
      '/workspace/project/src/app/profile/profile.module.ts',
      '/workspace/project/src/app/shared/shared.module.ts',
    ];

    const sorted = sortModulePathsByProximity(modulePaths, sourcePath);

    assert.deepStrictEqual(sorted, [
      '/workspace/project/src/app/profile/profile.module.ts',
      '/workspace/project/src/app/app.module.ts',
      '/workspace/project/src/app/shared/shared.module.ts',
    ]);
  });
});
