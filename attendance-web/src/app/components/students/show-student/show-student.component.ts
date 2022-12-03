import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { AsyncSubject, BehaviorSubject, catchError, filter, map, Observable, of, partition, share, switchMap, tap, throwError } from 'rxjs';
import { AttendanceSession } from 'src/app/models/attendance-session.model';
import { Student } from 'src/app/models/student.model';
import { User } from 'src/app/models/user.model';
import { AttendanceService } from 'src/app/services/attendance.service';
import { StudentsService } from 'src/app/services/students.service';
import { UsersService } from 'src/app/services/users.service';

enum PageState {
  STUDENT_LOADING = 1,
  STUDENT_NOT_FOUND,
  STUDENT_FOUND
};

class RichAttendanceSession {
  constructor(
    public session: AttendanceSession
  ) {}

  public getDurationStr(): string {
    if(!this.session.checkout_date) {
      return "-";
    }
    const diff = this.session.checkout_date.getTime() - this.session.checkin_date.getTime();
    const diffSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(diffSeconds / (60 * 60));
    const minutes = Math.floor((diffSeconds % (60 * 60)) / 60);
    return hours.toString() + ":" + minutes.toString().padStart(2, '0');
  }
}

@Component({
  selector: 'app-show-student',
  templateUrl: './show-student.component.html',
  styleUrls: ['./show-student.component.scss']
})
export class ShowStudentComponent implements OnInit {
  protected stateType = PageState;
  protected state = new BehaviorSubject<PageState>(PageState.STUDENT_LOADING);

  protected student = new AsyncSubject<Student>()
  protected invalidStudent = new AsyncSubject<boolean>()
  protected registeredBy = new AsyncSubject<User>()
  protected attendanceSessions = new MatTableDataSource<RichAttendanceSession>()

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  protected sessionColumns = ["checkInDate", "checkOutDate", "duration"]

  constructor(
    studentService: StudentsService,
    route: ActivatedRoute,
    private usersService: UsersService,
    private attendanceService: AttendanceService
  ) {
    const studentId = parseInt(route.snapshot.paramMap.get('studentId') ?? 'NaN' );
    let studentRequest: Observable<Student|null>;
    if(studentId) {
      studentRequest = studentService.getStudent(studentId).pipe(
        catchError((error: HttpErrorResponse) => {
          if(error.status == 404) {
            return of(null);
          }
          return throwError(() => error);
        })
      );
    } else {
      studentRequest = of(null);
    }

    const [student, invalidStudent] = partition(studentRequest.pipe(share()), it => it != null);
    (student as Observable<Student>).subscribe(this.student);
    (invalidStudent as Observable<null>).pipe( map(it => it == null) ).subscribe(this.invalidStudent);
  }

  ngOnInit(): void {
    this.student.subscribe((student) => {
      if(student) {
        this.state.next(PageState.STUDENT_FOUND);
      } else {
        this.state.next(PageState.STUDENT_NOT_FOUND);
      }
    })

    this.student.pipe(
      filter(it => !!it),
      switchMap(it => this.usersService.getUser(it.registered_by))
    ).subscribe(this.registeredBy);

    this.student.pipe(
      filter(it => !!it),
      switchMap(it => this.attendanceService.getSessions({forStudentId: (it as Student).id})),
      map(sessions => sessions.map(session => new RichAttendanceSession(session))),
    ).subscribe((sessions) => {
      this.attendanceSessions.paginator = this.paginator;
      this.attendanceSessions.data = sessions;
    });
  }

}
