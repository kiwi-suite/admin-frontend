import {Component, OnInit, ViewChild} from '@angular/core';
import {ResourceEditComponent} from "../resource/resource-edit.component";
import {FormGroup} from "@angular/forms";
import {FormlyFieldConfig} from "@ngx-formly/core";
import {PageService} from "../../services/resource/page.service";
import {takeUntil, map} from 'rxjs/operators';
import {ResourceModel} from "../../models/api.model";
import {PageVersionEditComponent} from "./page-version/page-version-edit.component";
import {PageVersionService} from "../../services/resource/page-version.service";
import {ResourceService} from "../../services/resource/resource.service";

@Component({
    selector: 'page-edit',
    templateUrl: './page-edit.component.html',
})
export class PageEditComponent extends ResourceEditComponent implements OnInit{
    @ViewChild(PageVersionEditComponent)
    private pageVersionEditComponent: PageVersionEditComponent;

    protected type = "page";

    private originalNavigationModel: any;

    navigationForm: FormGroup;
    navigationModel: any;
    navigationFields: FormlyFieldConfig[];

    protected dataService: PageService;

    ngOnInit() {
        this.initDataService(this.type);
        this.initModel();
    }

    protected initForm() {
        super.initForm();

        this.navigation$
            .subscribe((navigation) => {
                if (!navigation) {
                    return;
                }
                this.navigationForm = new FormGroup({});
                this.navigationFields = [
                    {
                        wrappers: ['section'],
                        templateOptions: {
                            label: 'Navigation',
                            icon: 'fa fa-fw fa-compass',
                        },
                        fieldGroup: [
                            {
                                key: 'navigation',
                                type: 'select',
                                templateOptions: {
                                    multiple: true,
                                    label: '',
                                    valueProp: 'name',
                                    options: navigation,
                                },
                            }
                        ],
                    },
                ];
            });
    }

    protected initModel() {
        this.route.params.pipe(takeUntil(this.destroyed$))
            .subscribe(params => {
                this.dataService.loadUpdateData(params['id']);
                this.dataService.updateData$
                    .pipe(takeUntil(this.destroyed$))
                    .subscribe((data: any) => {
                        if (!data) {
                            return;
                        }
                        this.dataService.loadNavigation(data.item.id);

                        this.originalData = data;

                        this.navigation$.pipe(
                            map(navigation => {
                                if (!navigation) {
                                    return;
                                }
                                return navigation.filter(item => item.active).map(item => item.name);
                            })
                        ).subscribe(navigationModel => {
                            if (!navigationModel) {
                                return;
                            }
                            this.originalNavigationModel = {navigation: navigationModel};
                            this.resetForm();
                        });
                        this.resetForm();
                    });
            });
    }

    get versionForm()
    {
        return this.pageVersionEditComponent.versionForm;
    }

    get versionService(): ResourceService
    {
        return this.dataStore.resource('page-version');
    }

    onSubmit(): void {

        if (this.form.valid === false) {
            this.toastr.error('An error occurred while saving the ' + this.resourceKey + '. Are all required fields entered?', 'Error');
            return;
        }

        if (this.versionForm.valid === false) {
            this.toastr.error('An error occurred while saving the ' + this.resourceKey + '. Are all required fields entered?', 'Error');
            return;
        }

        if (this.navigationForm.valid === false) {
            this.toastr.error('An error occurred while saving the navigation. Are all required fields entered?', 'Error');
            return;
        }

        this.dataService.update(this.data.item, this.form.getRawValue())
            .subscribe(
                (result) => {
                    this.dataService.updateNavigation(this.data.item.id, this.navigationForm.getRawValue())
                        .subscribe(
                            (result) => {

                                this.versionService.create(this.versionForm.getRawValue(), () => {
                                    return this.config.params.routes['pageVersionCreate'].replace('{id}', this.data.item.id);
                                }).subscribe(
                                    () => {
                                        this.toastr.success('Successfully published ', 'Success');


                                        this.dataService.loadNavigation(this.data.item.id);
                                        this.dataService.loadUpdateData(this.data.item.id);
                                        this.pageVersionEditComponent.loadUpdateData();

                                    }, () => {
                                        this.toastr.error('An error occurred while saving', 'Error');
                                    }
                                )

                            }, () => {
                                this.toastr.error('An error occurred while saving', 'Error');
                            }
                        );

                }, () => {
                    this.toastr.error('An error occurred while saving', 'Error');                }
            );
    }

    protected resetModel() {
        this.navigationModel = Object.assign({}, this.originalNavigationModel);
        super.resetModel();
    }

    protected get navigation$()
    {
        return this.dataService.navigation$.pipe(takeUntil(this.destroyed$));
    }
}