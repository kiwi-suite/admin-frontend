import {Component, OnDestroy, OnInit} from '@angular/core';
import {FieldType} from '@ngx-formly/core';
import {Observable, of} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {ReplaySubject} from 'rxjs/ReplaySubject';
import {DataStoreService} from '../../services';
import {ResourceListModel} from "../../models/api.model";

export class SelectOption {
    label: string;
    value?: any;
    group?: SelectOption[];
    disabled?: boolean;

    [key: string]: any;

    constructor(label: string, value?: any, children?: SelectOption[]) {
        this.label = label;
        this.value = value;
        this.group = children;
    }
}

@Component({
    selector: 'formly-field-select-native',
    template: `
        <select *ngIf="to.multiple; else singleSelect" class="form-control"
                [formControl]="formControl"
                [class.is-invalid]="showError"
                [multiple]="true"
                [formlyAttributes]="field">
            <ng-container *ngFor="let item of (selectOptions | async)">
                <optgroup *ngIf="item.group" label="{{item.label}}">
                    <option *ngFor="let child of item.group" [value]="child[valueProp]" [disabled]="child.disabled">
                        {{ child[labelProp] }}
                    </option>
                </optgroup>
                <option *ngIf="!item.group" [value]="item[valueProp]" [disabled]="item.disabled">{{ item[labelProp] }}
                </option>
            </ng-container>
        </select>

        <ng-template #singleSelect>
            <select class="form-control"
                    [formControl]="formControl"
                    [class.is-invalid]="showError"
                    [formlyAttributes]="field">
                <option *ngIf="to.placeholder" value="">{{ to.placeholder }}</option>
                <ng-container *ngFor="let item of selectOptions | async">
                    <optgroup *ngIf="item.group" label="{{item.label}}">
                        <option *ngFor="let child of item.group" [value]="child[valueProp]" [disabled]="child.disabled">
                            {{ child[labelProp] }}
                        </option>
                    </optgroup>
                    <option *ngIf="!item.group" [value]="item[valueProp]" [disabled]="item.disabled">{{ item[labelProp]
                        }}
                    </option>
                </ng-container>
            </select>
        </ng-template>
    `,
})
export class FormlyFieldSelectNative extends FieldType implements OnInit, OnDestroy {

    selectOptions$: Observable<any>;
    private destroyed$ = new ReplaySubject<boolean>(1);

    public constructor(private dataStore: DataStoreService) {
        super();
    }

    ngOnInit() {
        super.ngOnInit();
        if (this.to.resource) {
            this.dataStore.resource(this.to.resource).loadListData();
        }
        this.selectOptions$ = this.getSelectOptions();
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        this.destroyed$.next(true);
        this.destroyed$.complete();
    }

    get labelProp(): string {
        return this.to.labelProp || 'label';
    }

    get valueProp(): string {
        return this.to.valueProp || 'value';
    }

    get groupProp(): string {
        return this.to.groupProp || 'group';
    }

    private getSelectOptions(): Observable<ResourceListModel> {
        if (this.to.resource) {
            return this.dataStore.resource(this.to.resource).listData$.pipe(takeUntil(this.destroyed$));
        } if (!(this.to.options instanceof Observable)) {
            const options: SelectOption[] = [],
                groups: { [key: string]: SelectOption[] } = {};

            this.to.options.map((option: SelectOption) => {
                if (!option[this.groupProp]) {
                    options.push(option);
                } else {
                    if (groups[option[this.groupProp]]) {
                        groups[option[this.groupProp]].push(option);
                    } else {
                        groups[option[this.groupProp]] = [option];
                        options.push({
                            label: option[this.groupProp],
                            group: groups[option[this.groupProp]],
                        });
                    }
                }
            });

            return of({items: options, meta: [], schema: [], label: ""});
        } else {
            // return observable directly
            //return this.to.options;
        }
    }
}
