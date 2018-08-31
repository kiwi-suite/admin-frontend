import { Injectable } from '@angular/core';
import { KiwiConfirmModalComponent } from '../modals/kiwi-confirm-modal/kiwi-confirm-modal.component';
import { ConfirmModalData } from '../modals/kiwi-confirm-modal/confirm-modal-data.interface';
import { BsModalService } from 'ngx-bootstrap';
import { LocalStorageService } from './local-storage.service';
import { KiwiInputModalComponent } from '../modals/kiwi-input-modal/kiwi-input-modal.component';
import { InputModalData } from '../modals/kiwi-input-modal/input-modal-data.interface';

export interface BlockCopy {
  id: string;
  name: string;
  model: any;
}

@Injectable()
export class CopyService {

  private readonly COPIED_BLOCKS_STORAGE_KEY = 'copiedBlocks';

  constructor(private modal: BsModalService, private localStorage: LocalStorageService) {
  }

  private getRandomString(): string {
    return Math.random().toString(36).substring(3);
  }

  addCopiedBlock(model: any): Promise<boolean> {
    return new Promise((resolve) => {
      const initialState: InputModalData = {
        title: 'Enter a name for this copy',
        text: 'Enter a name which will identify your copy:',
        onConfirm: (name) => {
          const copiedBlocks = this.copiedBlocks;
          const id = this.getRandomString();
          copiedBlocks.push({id, name, model});
          this.localStorage.setItem(this.COPIED_BLOCKS_STORAGE_KEY, copiedBlocks);
        },
      };
      this.modal.show(KiwiInputModalComponent, {initialState});
      const sub = this.modal.onHidden.subscribe(() => {
        resolve(true);
      });
    });
  }

  get copiedBlocks(): Array<BlockCopy> {
    return this.localStorage.getItem(this.COPIED_BLOCKS_STORAGE_KEY, []);
  }

  removeCopiedBlock(copiedBlock: BlockCopy) {
    return new Promise((resolve) => {
      const initialState: ConfirmModalData = {
        title: 'Delete this copied block?',
        text: 'Do you really want to delete this copied block?',
        onConfirm: () => {
          let copiedBlocks = this.copiedBlocks;
          copiedBlocks = copiedBlocks.filter((data) => {
            return data.id !== copiedBlock.id;
          });
          this.localStorage.setItem(this.COPIED_BLOCKS_STORAGE_KEY, copiedBlocks);
        },
      };
      this.modal.show(KiwiConfirmModalComponent, {initialState});
      const sub = this.modal.onHidden.subscribe(() => {
        resolve(true);
      });
    });
  }

}
