import { Component, Inject } from '@angular/core';

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MeetingEventsComponent } from '../meeting-events.component';

export interface ConfirmDialogData {
  action: string,
  message: string,
  closeColor: string
}

@Component({
  selector: 'app-meeting-confirm-dialog',
  templateUrl: './meeting-confirm-dialog.component.html',
  styleUrls: ['./meeting-confirm-dialog.component.scss']
})
export class MeetingConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<MeetingEventsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}
}
