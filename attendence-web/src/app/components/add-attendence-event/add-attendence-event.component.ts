import { Component, Inject, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, combineLatest, map, Observable, startWith } from 'rxjs';
import { StudentsService } from 'src/app/services/students.service';
import { Student } from 'src/app/models/student.model';
import { AttendenceService } from 'src/app/services/attendence.service';
import { CheckIn } from 'src/app/models/check-in.model';
import { CheckOut } from 'src/app/models/check-out.model';
import { AttendenceAction, AttendenceConfirmDialogComponent } from './attendence-confirm-dialog/attendence-confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-add-attendence-event',
  templateUrl: './add-attendence-event.component.html',
  styleUrls: ['./add-attendence-event.component.scss']
})
export class AddAttendenceEventComponent implements OnInit {
  allStudents = new BehaviorSubject<Array<Student>>([])

  filteredStudents: Observable<Array<Student>>

  searchControl = new FormControl();
  actionControl = new FormControl('checkIn');

  constructor(
    studentsService : StudentsService,
    private attendenceService : AttendenceService,
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

  private updateStudent(student: Student, action: AttendenceAction) : void {
    let result: Observable<CheckIn|CheckOut>;
    switch(action) {
      case AttendenceAction.CheckIn:
        result = this.attendenceService.registerCheckIn(student.id);
        break;
      case AttendenceAction.CheckOut:
        result = this.attendenceService.registerCheckOut(student.id);
        break;
    }

    result.subscribe((response: CheckIn | CheckOut) => {
      let cachedStudents = this.allStudents.getValue();
      let modIdx = cachedStudents.findIndex(student => student.id == response.student_id);
      switch(action) {
        case AttendenceAction.CheckIn:
          cachedStudents[modIdx].last_check_in = response;
          break;
        case AttendenceAction.CheckOut:
          cachedStudents[modIdx].last_check_out = response;
          break;
      }
      this.allStudents.next(cachedStudents);
    });
  }

  private attendence(
    student: Student,
    shouldConfirm: boolean,
    action: AttendenceAction
  ) {
    if(shouldConfirm) {
      let dialogref = this.dialog.open(AttendenceConfirmDialogComponent, {
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
    this.attendence(student, shouldConfirm, AttendenceAction.CheckIn);
  }

  protected checkOut(student: Student, shouldConfirm: boolean = false): void {
    this.attendence(student, shouldConfirm, AttendenceAction.CheckOut);
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
