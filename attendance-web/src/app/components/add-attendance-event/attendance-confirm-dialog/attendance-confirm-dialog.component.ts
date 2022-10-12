import { Component, Inject } from '@angular/core';

import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Student } from 'src/app/models/student.model';
import { AddAttendanceEventComponent } from '../add-attendance-event.component';

export enum AttendanceAction {
  CheckIn,
  CheckOut
}

export interface ConfirmDialogData {
  action: AttendanceAction,
  student: Student
}

@Component({
  selector: 'app-attendance-confirm-dialog',
  templateUrl: './attendance-confirm-dialog.component.html',
  styleUrls: ['./attendance-confirm-dialog.component.scss']
})
export class AttendanceConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AddAttendanceEventComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  protected conjugate() {
    return {
      [AttendanceAction.CheckIn]: ["Check In", "checked in"],
      [AttendanceAction.CheckOut]: ["Check Out", "checked out"]
    }[this.data.action];
  }

  protected last_event(): Date | null {
    switch(this.data.action) {
      case AttendanceAction.CheckIn:
        return this.data.student.last_check_in?.created_at;
      case AttendanceAction.CheckOut:
        return this.data.student.last_check_out?.created_at;
      default:
        throw Error('Hit base case of exahustive switch!');
    }
  }
}
