import * as assert from 'assert';
import { inlineChildComponentTemplate } from '../../modules/inline-component';

suite('inline-component', () => {
  test('inlines only selected component usage when mode is selected', () => {
    const parentTemplate = '<div><app-button [label]="save"></app-button><app-button [label]="cancel"></app-button></div>';
    const firstStart = parentTemplate.indexOf('<app-button');
    const firstEnd = parentTemplate.indexOf('</app-button>') + '</app-button>'.length;

    const result = inlineChildComponentTemplate({
      parentTemplate,
      childSelector: 'app-button',
      childTemplate: '<button>{{label}}</button>',
      selectionStart: firstStart,
      selectionEnd: firstEnd,
      mode: 'selected',
    });

    assert.strictEqual(result.replacedCount, 1);
    assert.strictEqual(result.template, '<div><button>{{save}}</button><app-button [label]="cancel"></app-button></div>');
  });

  test('inlines all component usages when mode is all', () => {
    const parentTemplate = '<section><app-button [label]="save"></app-button><p>middle</p><app-button [label]="cancel"></app-button></section>';

    const result = inlineChildComponentTemplate({
      parentTemplate,
      childSelector: 'app-button',
      childTemplate: '<button>{{label}}</button>',
      selectionStart: 0,
      selectionEnd: 0,
      mode: 'all',
    });

    assert.strictEqual(result.replacedCount, 2);
    assert.strictEqual(result.template, '<section><button>{{save}}</button><p>middle</p><button>{{cancel}}</button></section>');
  });

  test('projects original content into ng-content when inlining', () => {
    const parentTemplate = '<app-button><span>Press</span></app-button>';

    const result = inlineChildComponentTemplate({
      parentTemplate,
      childSelector: 'app-button',
      childTemplate: '<button><ng-content></ng-content></button>',
      selectionStart: 0,
      selectionEnd: parentTemplate.length,
      mode: 'selected',
    });

    assert.strictEqual(result.replacedCount, 1);
    assert.strictEqual(result.template, '<button><span>Press</span></button>');
  });
});
