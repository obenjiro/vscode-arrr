import * as assert from 'assert';
import {
  getComponentInstance,
  getComponentText,
  getSpecText,
} from '../../modules/extract-to-folder-template';

suite('extract-to-folder-template', () => {
  test('builds Angular component class with pascal cased class name', () => {
    const output = getComponentText('profile-card', ['userName'], {styleExt: 'scss'});

    assert.ok(output.includes('export class ProfileCardComponent'));
    assert.ok(output.includes("templateUrl: './profile-card.component.html'"));
    assert.ok(output.includes("styleUrls: ['./profile-card.component.scss']"));
  });

  test('creates @Input members for every detected target', () => {
    const output = getComponentText('profile-card', ['userName', 'isAdmin'], {
      styleExt: 'css',
    });

    assert.ok(output.includes('@Input() userName'));
    assert.ok(output.includes('@Input() isAdmin'));
  });

  test('creates empty class body when there are no targets', () => {
    const output = getComponentText('profile-card', [], {styleExt: 'css'});

    assert.ok(output.includes('constructor () {}'));
    assert.ok(!output.includes('@Input()'));
  });

  test('builds component instance markup with property bindings', () => {
    const output = getComponentInstance('profile-card', ['userName', 'isAdmin']);

    assert.strictEqual(
      output,
      '<app-profile-card [userName]="userName" [isAdmin]="isAdmin"></app-profile-card>'
    );
  });

  test('builds component instance markup without bindings when there are no targets', () => {
    const output = getComponentInstance('profile-card', []);

    assert.strictEqual(output, '<app-profile-card ></app-profile-card>');
  });

  test('builds Angular spec text with expected fixture setup', () => {
    const output = getSpecText('profile-card');

    assert.ok(output.includes("describe('ProfileCardComponent'"));
    assert.ok(output.includes('TestBed.createComponent(ProfileCardComponent)'));
    assert.ok(output.includes("it('should be created'"));
  });
});
