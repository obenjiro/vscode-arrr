import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {resolveGeneratedComponentOptions} from '../../angular-config';

suite('angular-config', () => {
  test('uses component defaults from angular.json schematics', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'arrr-angular-json-'));
    fs.writeFileSync(
      path.join(tempRoot, 'angular.json'),
      JSON.stringify(
        {
          projects: {
            app: {
              schematics: {
                '@schematics/angular:component': {
                  style: 'scss',
                  skipTests: true,
                },
              },
            },
          },
        },
        null,
        2
      )
    );

    const options = resolveGeneratedComponentOptions(tempRoot, 'css');

    assert.strictEqual(options.styleExt, 'scss');
    assert.strictEqual(options.skipTests, true);
  });

  test('falls back to source style and tests enabled when no angular.json exists', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'arrr-no-angular-json-'));

    const options = resolveGeneratedComponentOptions(tempRoot, 'less');

    assert.strictEqual(options.styleExt, 'less');
    assert.strictEqual(options.skipTests, false);
  });
});
