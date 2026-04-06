import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {createFileIfDoesntExist, subfoldersListOf} from '../../file-system';
import {getAllTargets} from '../../template-parser';
import {getComponentInstance, getComponentText} from '../../modules/extract-to-folder-template';

const fixtureRoot = path.resolve(__dirname, '../../../src/test/fixtures/mini-project');

function readFixture(relativePath: string): string {
  return fs.readFileSync(path.join(fixtureRoot, relativePath), 'utf8');
}

suite('mini-project fixtures', () => {
  test('extracts targets from fixture template and ignores local vars/$event', () => {
    const template = readFixture('src/app/profile/profile-card.component.html');
    const targets = getAllTargets(template);

    assert.ok(targets.includes('title'));
    assert.ok(targets.includes('user'));
    assert.ok(targets.includes('save'));
    assert.ok(targets.includes('tags'));
    assert.ok(!targets.includes('profile'));
    assert.ok(!targets.includes('tag'));
    assert.ok(!targets.includes('$event'));
  });

  test('builds component text from fixture-derived targets', () => {
    const template = readFixture('src/app/profile/profile-card.component.html');
    const targets = getAllTargets(template);

    const componentText = getComponentText('extracted-profile', targets, {
      styleExt: 'scss',
    });

    assert.ok(componentText.includes('export class ExtractedProfileComponent'));
    assert.ok(componentText.includes("styleUrls: ['./extracted-profile.component.scss']"));
    assert.ok(componentText.includes('@Input() title'));
    assert.ok(componentText.includes('@Input() user'));
    assert.ok(componentText.includes('@Input() tags'));
  });

  test('builds instance markup from fixture-derived targets', () => {
    const template = readFixture('src/app/profile/profile-card.component.html');
    const targets = getAllTargets(template);

    const instance = getComponentInstance('extracted-profile', targets);

    assert.ok(instance.startsWith('<app-extracted-profile '));
    assert.ok(instance.includes('[title]="title"'));
    assert.ok(instance.includes('[user]="user"'));
    assert.ok(instance.includes('[tags]="tags"'));
  });

  test('createFileIfDoesntExist creates nested files and is idempotent', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrr-tests-'));
    const target = path.join(tmpDir, 'one/two/three/new.component.html');

    const first = createFileIfDoesntExist(target);
    const second = createFileIfDoesntExist(target);

    assert.strictEqual(first, target);
    assert.strictEqual(second, target);
    assert.ok(fs.existsSync(target));
  });

  test('subfoldersListOf handles empty root and respects ignore globs', () => {
    assert.deepStrictEqual(subfoldersListOf('', []), []);

    const folders = subfoldersListOf(fixtureRoot, ['**/profile/**']);

    assert.ok(folders.includes('/src'));
    assert.ok(folders.includes('/src/app'));
    assert.ok(!folders.includes('/src/app/profile'));
  });
});
