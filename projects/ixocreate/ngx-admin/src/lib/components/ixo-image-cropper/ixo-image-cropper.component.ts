import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { DomSanitizer, SafeStyle, SafeUrl } from '@angular/platform-browser';

interface MoveStart {
  active: boolean;
  type: string | null;
  position: string | null;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  clientX: number;
  clientY: number;
}

interface Dimensions {
  width: number;
  height: number;
}

export interface CropperPosition {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

@Component({
  selector: 'ixo-image-cropper',
  templateUrl: './ixo-image-cropper.component.html',
  styleUrls: ['./ixo-image-cropper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IxoImageCropperComponent {
  private originalImage: any = null;
  private moveStart: MoveStart = {
    active: false,
    type: null,
    position: null,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    clientX: 0,
    clientY: 0,
  };
  private maxSize: Dimensions = {width: 0, height: 0};
  private originalSize: Dimensions = {width: 0, height: 0};

  safeImgDataUrl: SafeUrl | string = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYV2NgAAIAAAUAAarVyFEAAAAASUVORK5CYII=';
  marginLeft: SafeStyle | string = '0px';
  imageVisible = false;
  cropper: CropperPosition = {
    x1: -100,
    x2: 10000,
    y1: -100,
    y2: 10000,
  };

  @Input() set imageUrl(imageUrl: string) {
    this.loadImage(imageUrl);
  }

  @Input() set imageBase64(imageBase64: string) {
    this.loadBase64Image(imageBase64);
  }

  @Input() format: 'png' | 'jpeg' | 'bmp' | 'webp' | 'ico' = 'png';
  @Input() maintainAspectRatio = true;
  @Input() aspectRatio = 1;
  @Input() resizeToWidth = 0;
  @Input() onlyScaleDown = false;
  @Input() imageQuality = 92;

  @Input() minWidth: number = null;
  @Input() minHeight: number = null;

  @Output() imageCroppedBase64 = new EventEmitter<string>();
  @Output() imageCroppedFile = new EventEmitter<File>();
  @Output() cropped = new EventEmitter<CropperPosition>();

  private copperPositionInput: CropperPosition;

  constructor(private elementRef: ElementRef, private sanitizer: DomSanitizer, private cd: ChangeDetectorRef) {
  }

  setCropperPosition(data: CropperPosition) {
    this.copperPositionInput = data;
    if (this.imageVisible) {
      this.cropper = this.cropDataFromOriginal(this.copperPositionInput);
      if (this.cropper.x1 < 0 || this.cropper.y1 < 0 || this.cropper.x2 > this.maxSize.width || this.cropper.y2 > this.maxSize.height) {
        this.resetCropperPosition();
      }
      this.checkCropperPosition(true);
      this.crop();
    }
  }

  private toDataUrl(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result);
      };
      reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
  }

  private loadImage(imageUrl: string) {
    this.toDataUrl(imageUrl, (base64) => {
      this.loadBase64Image(base64);
    });
  }

  private loadBase64Image(imageBase64: string) {
    this.originalImage = new Image();
    this.originalImage.onload = () => {
      this.originalSize.width = this.originalImage.width;
      this.originalSize.height = this.originalImage.height;
      this.cd.markForCheck();
    };
    this.safeImgDataUrl = this.sanitizer.bypassSecurityTrustResourceUrl(imageBase64);
    this.originalImage.src = imageBase64;
  }

  imageLoadedInView(): void {
    if (this.originalImage != null) {
      setTimeout(() => {
        this.imageVisible = true;
        this.setMaxSize();
        this.setCropperPosition(this.copperPositionInput);
        this.crop();
        this.cd.markForCheck();
      });
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.resizeCropperPosition();
    this.setMaxSize();
  }

  private resizeCropperPosition() {
    const displayedImage = this.elementRef.nativeElement.querySelector('.source-image');
    if (this.maxSize.width !== displayedImage.offsetWidth || this.maxSize.height !== displayedImage.offsetHeight) {
      this.cropper.x1 = this.cropper.x1 * displayedImage.offsetWidth / this.maxSize.width;
      this.cropper.x2 = this.cropper.x2 * displayedImage.offsetWidth / this.maxSize.width;
      this.cropper.y1 = this.cropper.y1 * displayedImage.offsetHeight / this.maxSize.height;
      this.cropper.y2 = this.cropper.y2 * displayedImage.offsetHeight / this.maxSize.height;
    }
  }

  private resetCropperPosition() {
    const displayedImage = this.elementRef.nativeElement.querySelector('.source-image');
    if (displayedImage.offsetWidth / this.aspectRatio < displayedImage.offsetHeight) {
      this.cropper.x1 = 0;
      this.cropper.x2 = displayedImage.offsetWidth;
      const cropperHeight = displayedImage.offsetWidth / this.aspectRatio;
      this.cropper.y1 = (displayedImage.offsetHeight - cropperHeight) / 2;
      this.cropper.y2 = this.cropper.y1 + cropperHeight;
    } else {
      this.cropper.y1 = 0;
      this.cropper.y2 = displayedImage.offsetHeight;
      const cropperWidth = displayedImage.offsetHeight * this.aspectRatio;
      this.cropper.x1 = (displayedImage.offsetWidth - cropperWidth) / 2;
      this.cropper.x2 = this.cropper.x1 + cropperWidth;
    }
  }

  startMove(event: any, moveType: string, position: string | null = null) {
    this.moveStart.active = true;
    this.moveStart.type = moveType;
    this.moveStart.position = position;
    this.moveStart.clientX = this.getClientX(event);
    this.moveStart.clientY = this.getClientY(event);
    Object.assign(this.moveStart, this.cropper);
    this.cd.markForCheck();
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  moveImg(event: any) {
    if (this.moveStart.active) {
      event.stopPropagation();
      event.preventDefault();
      this.setMaxSize();
      if (this.moveStart.type === 'move') {
        this.move(event);
        this.checkCropperPosition(true);
      } else if (this.moveStart.type === 'resize') {
        this.resize(event);
        this.checkCropperPosition(false);
      }
      this.cd.markForCheck();
    }
  }

  private setMaxSize() {
    const el = this.elementRef.nativeElement.querySelector('.source-image');
    this.maxSize.width = el.offsetWidth;
    this.maxSize.height = el.offsetHeight;
    this.marginLeft = this.sanitizer.bypassSecurityTrustStyle('calc(50% - ' + this.maxSize.width / 2 + 'px)');
  }

  private checkCropperPosition(maintainSize = false) {
    if (this.cropper.x1 < 0) {
      this.cropper.x2 -= maintainSize ? this.cropper.x1 : 0;
      this.cropper.x1 = 0;
    }
    if (this.cropper.y1 < 0) {
      this.cropper.y2 -= maintainSize ? this.cropper.y1 : 0;
      this.cropper.y1 = 0;
    }
    if (this.cropper.x2 > this.maxSize.width) {
      this.cropper.x1 -= maintainSize ? (this.cropper.x2 - this.maxSize.width) : 0;
      this.cropper.x2 = this.maxSize.width;
    }
    if (this.cropper.y2 > this.maxSize.height) {
      this.cropper.y1 -= maintainSize ? (this.cropper.y2 - this.maxSize.height) : 0;
      this.cropper.y2 = this.maxSize.height;
    }
  }

  @HostListener('document:mouseup', ['$event'])
  @HostListener('document:touchend', ['$event'])
  moveStop(event: any) {
    if (this.moveStart.active) {
      this.moveStart.active = false;
      this.crop();
      this.cd.markForCheck();
    }
  }

  private move(event: any) {
    const diffX = this.getClientX(event) - this.moveStart.clientX;
    const diffY = this.getClientY(event) - this.moveStart.clientY;

    this.cropper.x1 = this.moveStart.x1 + diffX;
    this.cropper.y1 = this.moveStart.y1 + diffY;
    this.cropper.x2 = this.moveStart.x2 + diffX;
    this.cropper.y2 = this.moveStart.y2 + diffY;
  }

  private resize(event: any) {
    let minWidth = this.minWidth ? this.minWidth * this.ratioToOriginalImage : 10;
    let minHeight = this.minHeight ? this.minHeight * this.ratioToOriginalImage : 10;

    if (this.minWidth && this.minHeight) {
      if (minWidth / minHeight < this.aspectRatio) {
        minWidth = minHeight * this.aspectRatio;
      } else {
        minHeight = minWidth / this.aspectRatio;
      }
    }

    const diffX = this.getClientX(event) - this.moveStart.clientX;
    const diffY = this.getClientY(event) - this.moveStart.clientY;
    switch (this.moveStart.position) {
      case 'left':
        this.cropper.x1 = Math.min(this.moveStart.x1 + diffX, this.cropper.x2 - minWidth);
        break;
      case 'topleft':
        this.cropper.x1 = Math.min(this.moveStart.x1 + diffX, this.cropper.x2 - minWidth);
        this.cropper.y1 = Math.min(this.moveStart.y1 + diffY, this.cropper.y2 - minHeight);
        break;
      case 'top':
        this.cropper.y1 = Math.min(this.moveStart.y1 + diffY, this.cropper.y2 - minHeight);
        break;
      case 'topright':
        this.cropper.x2 = Math.max(this.moveStart.x2 + diffX, this.cropper.x1 + minWidth);
        this.cropper.y1 = Math.min(this.moveStart.y1 + diffY, this.cropper.y2 - minHeight);
        break;
      case 'right':
        this.cropper.x2 = Math.max(this.moveStart.x2 + diffX, this.cropper.x1 + minWidth);
        break;
      case 'bottomright':
        this.cropper.x2 = Math.max(this.moveStart.x2 + diffX, this.cropper.x1 + minWidth);
        this.cropper.y2 = Math.max(this.moveStart.y2 + diffY, this.cropper.y1 + minHeight);
        break;
      case 'bottom':
        this.cropper.y2 = Math.max(this.moveStart.y2 + diffY, this.cropper.y1 + minHeight);
        break;
      case 'bottomleft':
        this.cropper.x1 = Math.min(this.moveStart.x1 + diffX, this.cropper.x2 - minWidth);
        this.cropper.y2 = Math.max(this.moveStart.y2 + diffY, this.cropper.y1 + minHeight);
        break;
    }

    if (this.maintainAspectRatio) {
      this.checkAspectRatio();
    }
  }

  private checkAspectRatio() {
    let overflowX = 0;
    let overflowY = 0;

    switch (this.moveStart.position) {
      case 'top':
        this.cropper.x2 = this.cropper.x1 + (this.cropper.y2 - this.cropper.y1) * this.aspectRatio;
        overflowX = Math.max(this.cropper.x2 - this.maxSize.width, 0);
        overflowY = Math.max(0 - this.cropper.y1, 0);
        if (overflowX > 0 || overflowY > 0) {
          this.cropper.x2 -= (overflowY * this.aspectRatio) > overflowX ? (overflowY * this.aspectRatio) : overflowX;
          this.cropper.y1 += (overflowY * this.aspectRatio) > overflowX ? overflowY : overflowX / this.aspectRatio;
        }
        break;
      case 'bottom':
        this.cropper.x2 = this.cropper.x1 + (this.cropper.y2 - this.cropper.y1) * this.aspectRatio;
        overflowX = Math.max(this.cropper.x2 - this.maxSize.width, 0);
        overflowY = Math.max(this.cropper.y2 - this.maxSize.height, 0);
        if (overflowX > 0 || overflowY > 0) {
          this.cropper.x2 -= (overflowY * this.aspectRatio) > overflowX ? (overflowY * this.aspectRatio) : overflowX;
          this.cropper.y2 -= (overflowY * this.aspectRatio) > overflowX ? overflowY : (overflowX / this.aspectRatio);
        }
        break;
      case 'topleft':
        this.cropper.y1 = this.cropper.y2 - (this.cropper.x2 - this.cropper.x1) / this.aspectRatio;
        overflowX = Math.max(0 - this.cropper.x1, 0);
        overflowY = Math.max(0 - this.cropper.y1, 0);
        if (overflowX > 0 || overflowY > 0) {
          this.cropper.x1 += (overflowY * this.aspectRatio) > overflowX ? (overflowY * this.aspectRatio) : overflowX;
          this.cropper.y1 += (overflowY * this.aspectRatio) > overflowX ? overflowY : overflowX / this.aspectRatio;
        }
        break;
      case 'topright':
        this.cropper.y1 = this.cropper.y2 - (this.cropper.x2 - this.cropper.x1) / this.aspectRatio;
        overflowX = Math.max(this.cropper.x2 - this.maxSize.width, 0);
        overflowY = Math.max(0 - this.cropper.y1, 0);
        if (overflowX > 0 || overflowY > 0) {
          this.cropper.x2 -= (overflowY * this.aspectRatio) > overflowX ? (overflowY * this.aspectRatio) : overflowX;
          this.cropper.y1 += (overflowY * this.aspectRatio) > overflowX ? overflowY : overflowX / this.aspectRatio;
        }
        break;
      case 'right':
      case 'bottomright':
        this.cropper.y2 = this.cropper.y1 + (this.cropper.x2 - this.cropper.x1) / this.aspectRatio;
        overflowX = Math.max(this.cropper.x2 - this.maxSize.width, 0);
        overflowY = Math.max(this.cropper.y2 - this.maxSize.height, 0);
        if (overflowX > 0 || overflowY > 0) {
          this.cropper.x2 -= (overflowY * this.aspectRatio) > overflowX ? (overflowY * this.aspectRatio) : overflowX;
          this.cropper.y2 -= (overflowY * this.aspectRatio) > overflowX ? overflowY : overflowX / this.aspectRatio;
        }
        break;
      case 'left':
      case 'bottomleft':
        this.cropper.y2 = this.cropper.y1 + (this.cropper.x2 - this.cropper.x1) / this.aspectRatio;
        overflowX = Math.max(0 - this.cropper.x1, 0);
        overflowY = Math.max(this.cropper.y2 - this.maxSize.height, 0);
        if (overflowX > 0 || overflowY > 0) {
          this.cropper.x1 += (overflowY * this.aspectRatio) > overflowX ? (overflowY * this.aspectRatio) : overflowX;
          this.cropper.y2 -= (overflowY * this.aspectRatio) > overflowX ? overflowY : overflowX / this.aspectRatio;
        }
        break;
    }
  }

  private crop() {
    const displayedImage = this.elementRef.nativeElement.querySelector('.source-image');
    if (displayedImage && this.originalImage != null) {
      const ratio = this.originalSize.width / displayedImage.offsetWidth;
      const left = Math.round(this.cropper.x1 * ratio);
      const top = Math.round(this.cropper.y1 * ratio);
      const width = Math.round((this.cropper.x2 - this.cropper.x1) * ratio);
      const height = Math.round((this.cropper.y2 - this.cropper.y1) * ratio);
      const resizeRatio = this.getResizeRatio(width);

      const cropCanvas = document.createElement('canvas') as HTMLCanvasElement;
      cropCanvas.width = width * resizeRatio;
      cropCanvas.height = height * resizeRatio;

      const ctx = cropCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(this.originalImage, left, top, width, height, 0, 0, width * resizeRatio, height * resizeRatio);
        const quality = Math.min(1, Math.max(0, this.imageQuality / 100));
        const croppedImage = cropCanvas.toDataURL(`image/${this.format}`, quality);
        if (croppedImage.length > 10) {
          this.imageCroppedBase64.emit(croppedImage);
        }
        cropCanvas.toBlob(
          (fileImage: File) => this.imageCroppedFile.emit(fileImage),
          `image/${this.format}`,
          quality,
        );
        this.emitCropData();
      }
    }
  }

  private getResizeRatio(width: number): number {
    return this.resizeToWidth > 0 && (!this.onlyScaleDown || width > this.resizeToWidth) ? this.resizeToWidth / width : 1;
  }

  private getClientX(event: any) {
    return event.clientX != null ? event.clientX : event.touches[0].clientX;
  }

  private getClientY(event: any) {
    return event.clientY != null ? event.clientY : event.touches[0].clientY;
  }

  private emitCropData() {
    this.cropped.emit(this.cropDataToOriginal(this.cropper));
  }

  private cropDataFromOriginal(data: CropperPosition) {
    return {
      x1: data && typeof data.x1 !== 'undefined' ? data.x1 * this.ratioToOriginalImage : -100,
      x2: data && typeof data.x2 !== 'undefined' ? data.x2 * this.ratioToOriginalImage : -100,
      y1: data && typeof data.y1 !== 'undefined' ? data.y1 * this.ratioToOriginalImage : 10000,
      y2: data && typeof data.y2 !== 'undefined' ? data.y2 * this.ratioToOriginalImage : 10000,
    };
  }

  private cropDataToOriginal(data: CropperPosition) {
    return {
      x1: Math.round(data.x1 / this.ratioToOriginalImage),
      x2: Math.round(data.x2 / this.ratioToOriginalImage),
      y1: Math.round(data.y1 / this.ratioToOriginalImage),
      y2: Math.round(data.y2 / this.ratioToOriginalImage),
    };
  }

  get ratioToOriginalImage() {
    return this.maxSize.width / this.originalSize.width;
  }
}
