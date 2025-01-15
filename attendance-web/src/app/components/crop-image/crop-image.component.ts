import { AfterViewInit, Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Croppie from 'croppie';
import { from } from 'rxjs';

export interface CropImageInput {
  inputImage: Blob
};

@Component({
    selector: 'app-crop-image',
    templateUrl: './crop-image.component.html',
    styleUrl: './crop-image.component.scss',
    standalone: false
})
export class CropImageComponent {
  @ViewChild('croppie') croppieDiv!: ElementRef;

  croppie: any|undefined;

  constructor(
    @Inject(MAT_DIALOG_DATA) private input: CropImageInput,
    private dialogRef: MatDialogRef<CropImageComponent>
  ) {
    dialogRef.afterOpened().subscribe(() => {
      const elem = this.croppieDiv.nativeElement;
      this.croppie = new Croppie(elem, {
        viewport: {width: elem.offsetWidth - 50, height: elem.offsetHeight - 50, type: 'square'},
        showZoomer: false
      });

      this.croppie.bind({
        url: URL.createObjectURL(this.input.inputImage)
      });
    });
  }

  cancel() {
    this.dialogRef.close(null);
  }

  save() {
    const result = this.croppie.result({
      type: 'blob',
      format: 'png',
      circle: false
    });
    this.dialogRef.close(from(result));
  }
}
