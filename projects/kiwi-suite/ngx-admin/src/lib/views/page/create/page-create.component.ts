import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewAbstractComponent } from '../../../components/view.abstract.component';
import { AppDataService } from '../../../services/data/app-data.service';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { NotificationService } from '../../../services/notification.service';
import { SchemaTransformService } from '../../../services/schema-transform.service';

@Component({
  templateUrl: './page-create.component.html',
})
export class PageCreateComponent extends ViewAbstractComponent implements OnInit {

  data$: Promise<any>;
  locale: string;
  parentSitemapId: string;

  form: FormGroup = new FormGroup({});
  fields: FormlyFieldConfig[];
  showButton = false;

  constructor(protected route: ActivatedRoute,
              protected router: Router,
              protected appData: AppDataService,
              protected notification: NotificationService,
              protected schemaTransformService: SchemaTransformService) {
    super();
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.locale = params.locale;
      this.parentSitemapId = params.parentSitemapId;
      this.data$ = this.appData.getPageCreateSchema(this.parentSitemapId).then((data) => {
        data.schema = this.schemaTransformService.transformForm(data.schema);
        this.fields = data.schema ? data.schema : [];
        setTimeout(() => this.showButton = true);
        return data;
      });
    });
  }

  onSubmit(): void {
    if (this.form.valid === false) {
      this.notification.formErrors(this.form);
    } else {
      const data = this.form.getRawValue();
      data.locale = this.locale;
      data.parentSitemapId = this.parentSitemapId;
      this.appData.createResource('page', data).then((response) => {
        this.notification.success('Page successfully created', 'Success');
        this.router.navigateByUrl('/page/' + response.id + '/edit');
      }).catch((error) => this.notification.apiError(error));
    }
  }
}
