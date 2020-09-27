import {pascalCase} from "change-case";

export function getSpecText(componentName: string): any {
    return `import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ${pascalCase(
        componentName
    )}Component } from './${componentName}.component';

describe('${pascalCase(componentName)}Component', () => {
    let component: ${pascalCase(componentName)}Component;
    let fixture: ComponentFixture<${pascalCase(componentName)}Component>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ ${pascalCase(componentName)}Component ]
        })
        .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(${pascalCase(
        componentName
    )}Component);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
    });
});`;
}

export function getComponentText(componentName: string, targets: string[], sourceComponentConfig: any): string {
    return `import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-${componentName}',
    templateUrl: './${componentName}.component.html',
    styleUrls: ['./${componentName}.component.${sourceComponentConfig.styleExt}']
})
export class ${pascalCase(componentName)}Component {
    ${targets.map((target) => `@Input() ${target}`).join('\n    ')}
    constructor () {}
}`;
}

export function getComponentInstance(
    componentName: string,
    targets: string[]
): string {
    return `<app-${componentName} ${targets
        .map((target) => `[${target}]="${target}"`)
        .join(' ')}></app-${componentName}>`;
}
