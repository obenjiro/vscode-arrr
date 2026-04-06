import * as assert from 'assert';

import {getDeclarationChangeDescriptor} from '../../modules/module-declaration';

suite('extract-to-folder', () => {
  test('returns null when host module has no declarations array', () => {
    const moduleText = `
      import { NgModule } from '@angular/core';

      @NgModule({
        imports: [],
      })
      export class AppModule {}
    `;

    const change = getDeclarationChangeDescriptor(moduleText, 'child-card');

    assert.strictEqual(change, null);
  });

  test('returns insertion descriptor when declarations array exists', () => {
    const moduleText = `
      @NgModule({
        declarations: [AppComponent],
      })
      export class AppModule {}
    `;

    const change = getDeclarationChangeDescriptor(moduleText, 'child-card');

    assert.ok(change);
    assert.strictEqual(change?.targetText, 'declarations: [\n    ChildCardComponent,');
  });

  test('adds declaration and export when declaring module is not AppModule', () => {
    const moduleText = `
      @NgModule({
        declarations: [ProfileCardComponent],
        exports: [ProfileCardComponent],
      })
      export class ProfileModule {}
    `;

    const change = getDeclarationChangeDescriptor(moduleText, 'child-card');

    assert.ok(change);
    assert.ok(
      change?.targetText.includes('declarations: [\n    ChildCardComponent,ProfileCardComponent],')
    );
    assert.ok(
      change?.targetText.includes('exports: [\n    ChildCardComponent,')
    );
  });
});
