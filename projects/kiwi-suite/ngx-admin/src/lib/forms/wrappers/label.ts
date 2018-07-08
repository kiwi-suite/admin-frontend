import { Component, ViewChild, ViewContainerRef } from '@angular/core';
import { FieldWrapper } from '@ngx-formly/core';

@Component({
  selector: 'formly-wrapper-label',
  template: `
          <label [attr.for]="id" class="form-control-label control-label" *ngIf="to.label">
              <small><b>{{ to.label }}</b><ng-container *ngIf="to.required">&nbsp;*</ng-container></small>
          </label>
          <ng-template #fieldComponent></ng-template>
  `,
})
export class FormlyWrapperLabel extends FieldWrapper {
  @ViewChild('fieldComponent', {read: ViewContainerRef}) fieldComponent: ViewContainerRef;
}
