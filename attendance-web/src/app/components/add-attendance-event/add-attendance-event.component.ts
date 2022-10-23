import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, combineLatest, forkJoin, interval, map, Observable, of, ReplaySubject, startWith, Subject, Subscription, switchMap } from 'rxjs';
import { StudentsService } from 'src/app/services/students.service';
import { Student } from 'src/app/models/student.model';
import { AttendanceService } from 'src/app/services/attendance.service';
import { CheckIn } from 'src/app/models/check-in.model';
import { CheckOut } from 'src/app/models/check-out.model';
import { AttendanceAction, AttendanceConfirmDialogComponent } from './attendance-confirm-dialog/attendance-confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-add-attendance-event',
  templateUrl: './add-attendance-event.component.html',
  styleUrls: ['./add-attendance-event.component.scss']
})
export class AddAttendanceEventComponent implements OnInit, AfterViewInit, OnDestroy {
  allStudents = new BehaviorSubject<Array<Student>>([]);

  filteredStudents = new ReplaySubject<Array<Student>>(1);
  searchValue = new Subject<string>();

  actionControl = new FormControl('checkIn');

  polling: Subscription|null = null;

  private studentsSub!: Subscription;

  constructor(
    private studentsService : StudentsService,
    private attendanceService : AttendanceService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Get students from database
    this.studentsSub = this.studentsService.getAllStudents().subscribe((students) => this.allStudents.next(students));

    // Set up polling for new check-ins/check-outs
    this.polling = interval(environment.pollInterval).pipe(
      switchMap(() => {
        const since = new Date();
        since.setSeconds(since.getSeconds() - (1 + (environment.pollInterval / 1000)));
        return forkJoin({
          'checkIns': this.attendanceService.getCheckIns({since: since}),
          'checkOuts': this.attendanceService.getCheckOuts({since: since})
        })
      }),
      map(updates => {
        updates.checkIns.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
        updates.checkOuts.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
        return this.allStudents.getValue().map(student => {
          let newStudent : Student = {
            id: student.id,
            name: student.name,
            created_at: student.created_at,
            updated_at: student.updated_at,
            last_check_in: updates.checkIns.find(item => item.student_id == student.id) ?? student.last_check_in,
            last_check_out: updates.checkOuts.find(item => item.student_id == student.id) ?? student.last_check_out
          };
          return newStudent;
        });
      })
    ).subscribe((students) => this.allStudents.next(students));

    // Combine search, sort filters, and student roster into the final observable which
    // will be formatted and shown to the user
    combineLatest([
      this.allStudents,
      this.searchValue.pipe(startWith("")),
      this.actionControl.valueChanges.pipe(startWith('checkIn'))
    ]).pipe(map((values : Array<Array<Student> | string | null>) => {
      let students = (values[0] as Array<Student>);
      let search = ((values[1] as string | null) ?? "").toLocaleLowerCase();
      let action = values[2] as string;

      let value = students;

      // implement search
      if(search != "") {
        value = value.filter(student => student.name.toLocaleLowerCase().includes(search));
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
      })).subscribe(this.filteredStudents)
  }

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
    this.studentsSub.unsubscribe();
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
      let cachedStudents = structuredClone(this.allStudents.getValue());
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
    })).subscribe((students) => this.allStudents.next(students));
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
