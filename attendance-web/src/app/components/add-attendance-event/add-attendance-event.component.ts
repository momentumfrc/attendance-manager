import { Component, Inject, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, combineLatest, map, Observable, startWith } from 'rxjs';
import { StudentsService } from 'src/app/services/students.service';
import { Student } from 'src/app/models/student.model';
import { AttendanceService } from 'src/app/services/attendance.service';
import { CheckIn } from 'src/app/models/check-in.model';
import { CheckOut } from 'src/app/models/check-out.model';
import { AttendanceAction, AttendanceConfirmDialogComponent } from './attendance-confirm-dialog/attendance-confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-add-attendance-event',
  templateUrl: './add-attendance-event.component.html',
  styleUrls: ['./add-attendance-event.component.scss']
})
export class AddAttendanceEventComponent implements OnInit {
  allStudents = new BehaviorSubject<Array<Student>>([])

  filteredStudents: Observable<Array<Student>>

  searchControl = new FormControl();
  actionControl = new FormControl('checkIn');

  constructor(
    studentsService : StudentsService,
    private attendanceService : AttendanceService,
    private dialog: MatDialog
  ) {
    studentsService.getAllStudents().subscribe(this.allStudents)
    this.filteredStudents = combineLatest([
      this.allStudents,
      (this.searchControl.valueChanges as Observable<string | null>).pipe(startWith("")),
      this.actionControl.valueChanges.pipe(startWith('checkIn'))
    ]).pipe(map((values : Array<Array<Student> | string | null>) => {
      let students = (values[0] as Array<Student>);
      let search = ((values[1] as string | null) ?? "").toLocaleLowerCase();
      let action = values[2] as string;

      let value = students;

      // implement search
      if(search != "") {
        value = value.filter(student => student.name.split(" ")
          .some(namePart => namePart.toLocaleLowerCase().startsWith(search)));
      }

      // implement sort
      value.sort((a: Student, b: Student) => {
        const aCheckedIn = this.isCheckedIn(a);
        const bCheckedIn = this.isCheckedIn(b);

        if(aCheckedIn != bCheckedIn) {
          if(aCheckedIn) {
            return action == 'checkIn' ? 1 : -1;
          } else {
            return action == 'checkIn' ? -1 : 1;
          }
        }

        return a.name.localeCompare(b.name);
      });

      return value;
      }));
  }

  ngOnInit(): void {
  }

  private updateStudent(student: Student, action: AttendanceAction) : void {
    let result: Observable<CheckIn|CheckOut>;
    switch(action) {
      case AttendanceAction.CheckIn:
        result = this.attendanceService.registerCheckIn(student.id);
        break;
      case AttendanceAction.CheckOut:
        result = this.attendanceService.registerCheckOut(student.id);
        break;
    }

    result.pipe(map((response: CheckIn | CheckOut) => {
      let cachedStudents = this.allStudents.getValue();
      let modIdx = cachedStudents.findIndex(student => student.id == response.student_id);
      switch(action) {
        case AttendanceAction.CheckIn:
          cachedStudents[modIdx].last_check_in = response;
          break;
        case AttendanceAction.CheckOut:
          cachedStudents[modIdx].last_check_out = response;
          break;
      }
      return cachedStudents;
    })).subscribe(this.allStudents);
  }

  private attendance(
    student: Student,
    shouldConfirm: boolean,
    action: AttendanceAction
  ) {
    if(shouldConfirm) {
      let dialogref = this.dialog.open(AttendanceConfirmDialogComponent, {
        width: '320px',
        data: {student: student, action: action}
      });
      dialogref.afterClosed().subscribe((confirmed: boolean) => {
        if(!confirmed) {
          return;
        }
        this.updateStudent(student, action);
      })
    } else {
      this.updateStudent(student, action);
    }
  }

  protected checkIn(student: Student, shouldConfirm: boolean = false): void {
    this.attendance(student, shouldConfirm, AttendanceAction.CheckIn);
  }

  protected checkOut(student: Student, shouldConfirm: boolean = false): void {
    this.attendance(student, shouldConfirm, AttendanceAction.CheckOut);
  }


  protected isCheckedIn(student: Student): boolean {
    if(student.last_check_in == null) {
      return false;
    }

    if(student.last_check_out == null) {
      return true;
    }

    return student.last_check_out.updated_at < student.last_check_in.updated_at;
  }
}
