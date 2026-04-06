import * as assert from 'assert';
import {getAllTargets, getNodeCtor, templateParser, visitTarget} from '../../template-parser';

suite('template-parser', () => {
  test('parse returns Angular AST without parser errors for valid HTML', () => {
    const output = templateParser.parse('<section><div>{{title}}</div></section>');

    assert.strictEqual((output.errors || []).length, 0);
    assert.ok(output.nodes.length > 0);
  });

  test('getNodeCtor returns constructor name', () => {
    const node = {constructor: {name: 'BoundText'}};

    assert.strictEqual(getNodeCtor(node), 'BoundText');
  });

  test('nodeToRange resolves start and end from sourceSpan', () => {
    const output = templateParser.parse('<div>{{title}}</div>');
    const firstNode: any = output.nodes[0];
    const range = templateParser.nodeToRange(firstNode);

    assert.ok(Array.isArray(range));
    assert.strictEqual(range?.length, 2);
    assert.ok((range?.[0] as number) >= 0);
    assert.ok((range?.[1] as number) > (range?.[0] as number));
  });

  test('getAllTargets extracts top-level properties and methods', () => {
    const targets = getAllTargets(`
      <div>{{ title }}</div>
      <button (click)="save()">Save</button>
      <span [class.done]="isDone"></span>
    `);

    assert.deepStrictEqual(targets.sort(), ['isDone', 'save', 'title']);
  });

  test('getAllTargets excludes local ngFor variable references', () => {
    const targets = getAllTargets(`
      <div *ngFor="let item of items">
        {{ item.name }}
        {{ title }}
      </div>
    `);

    assert.ok(targets.includes('items'));
    assert.ok(targets.includes('title'));
    assert.ok(!targets.includes('item'));
  });

  test('getAllTargets de-duplicates repeated identifiers', () => {
    const targets = getAllTargets('<div>{{ title }} {{ title }} {{ title }}</div>');

    assert.deepStrictEqual(targets, ['title']);
  });

  test('visitTarget visits matching object nodes recursively', () => {
    const tree = {
      a: [{flag: true}, {flag: false}],
      b: {flag: true, c: {flag: true}},
    };
    let count = 0;

    visitTarget(
      tree,
      (value: any) => Boolean(value.flag),
      () => {
        count += 1;
      }
    );

    assert.strictEqual(count, 3);
  });

  test('default parse options preserveWhitespaces is disabled', () => {
    const options = templateParser.getDefaultOptions();

    assert.strictEqual(options.preserveWhitespaces, false);
  });


  test('getAllTargets handles safe navigation expressions', () => {
    const targets = getAllTargets('<div>{{ user?.profile?.name }}</div>');

    assert.ok(targets.includes('user'));
  });

  test('getAllTargets captures method call target and skips nested object property names', () => {
    const targets = getAllTargets('<button (click)="save(user.name)"></button>');

    assert.ok(targets.includes('save'));
    assert.ok(targets.includes('user'));
    assert.ok(!targets.includes('name'));
  });
});
