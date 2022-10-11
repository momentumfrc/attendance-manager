import { Component, Inject } from '@angular/core';

import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Student } from 'src/app/models/student.model';
import { AddAttendenceEventComponent } from '../add-attendence-event.component';

export enum AttendenceAction {
  CheckIn,
  CheckOut
}

export interface ConfirmDialogData {
  action: AttendenceAction,
  student: Student
}

@Component({
  selector: 'app-attendence-confirm-dialog',
  templateUrl: './attendence-confirm-dialog.component.html',
  styleUrls: ['./attendence-confirm-dialog.component.scss']
})
export class AttendenceConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AddAttendenceEventComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  protected conjugate() {
    return {
      [AttendenceAction.CheckIn]: ["Check In", "checked in"],
      [AttendenceAction.CheckOut]: ["Check Out", "checked out"]
    }[this.data.action];
  }

  protected last_event(): Date {
    switch(this.data.action) {
      case AttendenceAction.CheckIn:
        return this.data.student.last_check_in.created_at;
      case AttendenceAction.CheckOut:
        return this.data.student.last_check_out.created_at;
      default:
        throw Error('Hit base case of exahustive switch!');
    }
  }
}
