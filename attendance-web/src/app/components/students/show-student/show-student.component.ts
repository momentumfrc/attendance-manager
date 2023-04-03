import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute } from '@angular/router';
import { DateTime } from 'luxon';
import { AsyncSubject, BehaviorSubject, catchError, filter, map, Observable, of, ReplaySubject, share, switchMap, tap, throwError } from 'rxjs';
import { AttendanceSession } from 'src/app/models/attendance-session.model';
import { Student } from 'src/app/models/student.model';
import { User } from 'src/app/models/user.model';
import { AttendanceService } from 'src/app/services/attendance.service';
import { ErrorService } from 'src/app/services/error.service';
import { StudentsService } from 'src/app/services/students.service';
import { UsersService } from 'src/app/services/users.service';

enum PageState {
  STUDENT_LOADING = 1,
  STUDENT_NOT_FOUND,
  STUDENT_FOUND
};

function formatTimeDiff(diffSeconds: number) {
  const hours = Math.floor(diffSeconds / (60 * 60));
  const minutes = Math.floor((diffSeconds % (60 * 60)) / 60);
  const seconds = diffSeconds % 60;
  return hours.toString()
    + ":" + minutes.toString().padStart(2, '0')
    + ":" + seconds.toString().padStart(2, '0');
}

class RichAttendanceSession {
  constructor(
    public session: AttendanceSession
  ) {}

  public getDurationStr(): string {
    if(!this.session.checkout_date) {
      return "-";
    }
    const diff = this.session.checkout_date.toMillis() - this.session.checkin_date.toMillis();
    const diffSeconds = Math.floor(diff / 1000);
    return formatTimeDiff(diffSeconds);
  }
}

class AttendanceStats {
  constructor(
    public sessions: Array<AttendanceSession>
  ) {}

  public getTotalDuration(): string {
    const totalMs = this.sessions.reduce((accumulator, current) => {
      if(!current.checkout_date) {
        return accumulator;
      }
      const diff = current.checkout_date.toMillis() - current.checkin_date.toMillis();
      return accumulator + diff;
    }, 0);
    return formatTimeDiff(Math.floor(totalMs / 1000));
  }

  public getMissedCheckouts(): number {
    return this.sessions.filter(it => !it.checkout_id).length;
  }
}

class SessionDataSource implements DataSource<RichAttendanceSession> {
  private data: Array<RichAttendanceSession> = [];

  public readonly pageSizeOptions = [25, 50, 100];

  private paginatedData = new ReplaySubject<Array<RichAttendanceSession>>(1);

  private lastPageSize = this.pageSizeOptions[0];

  public setData(data: Array<RichAttendanceSession>): void {
    this.data = data;
    this.updateSlice(0, this.lastPageSize);
  }

  public paginate(event: PageEvent) {
    this.lastPageSize = event.pageSize;
    this.updateSlice(event.pageSize * event.pageIndex, event.pageSize * (event.pageIndex + 1));
  }

  public getDataSize(): number {
    return this.data.length;
  }

  private updateSlice(startIdx: number, endIdx: number) {
    this.paginatedData.next(this.data.slice(startIdx, endIdx));
  }

  connect(collectionViewer: CollectionViewer): Observable<readonly RichAttendanceSession[]> {
    return this.paginatedData;
  }

  disconnect(collectionViewer: CollectionViewer): void {}
}

@Component({
  selector: 'app-show-student',
  templateUrl: './show-student.component.html',
  styleUrls: ['./show-student.component.scss']
})
export class ShowStudentComponent implements OnInit {
  readonly dateTimeShort = DateTime.DATETIME_SHORT;

  protected stateType = PageState;
  protected state = new BehaviorSubject<PageState>(PageState.STUDENT_LOADING);

  protected student = new AsyncSubject<Student>()
  protected registeredBy = new AsyncSubject<User>()
  protected attendanceSessions = new SessionDataSource()
  protected attendanceStats = new AsyncSubject<AttendanceStats>()

  protected sessionColumns = ["checkInDate", "checkOutDate", "duration"]

  constructor(
    studentService: StudentsService,
    route: ActivatedRoute,
    private usersService: UsersService,
    private attendanceService: AttendanceService,
    private errorService: ErrorService
  ) {
    const studentId = parseInt(route.snapshot.paramMap.get('studentId') ?? 'NaN' );
    let studentRequest: Observable<Student|null>;
    if(studentId) {
      studentRequest = studentService.getStudent(studentId, false).pipe(
        catchError((error: HttpErrorResponse) => {
          if(error.status == 404) {
            return of(null);
          }
          throw error;
        }),
        errorService.interceptErrors()
      );
    } else {
      studentRequest = of(null);
    }

    const sharedStudentRequest = studentRequest.pipe(share());
    sharedStudentRequest.subscribe((student) => {
      if(student) {
        this.state.next(PageState.STUDENT_FOUND);
      } else {
        this.state.next(PageState.STUDENT_NOT_FOUND);
      }
    })
    sharedStudentRequest.pipe(
      filter((it): it is Student => !!it)
    ).subscribe(this.student);
  }

  ngOnInit(): void {
    this.student.pipe(
      switchMap(it => this.usersService.getUser(it.registered_by))
    ).subscribe(this.registeredBy);

    const sessions = this.student.pipe(
      filter(it => !!it),
      switchMap(it => this.attendanceService.getSessions({forStudentId: it.id})),
      share()
    );

    sessions.pipe(
      map(sessions => sessions.map(session => new RichAttendanceSession(session))),
    ).subscribe((sessions) => {
      this.attendanceSessions.setData(sessions);
    });

    sessions.pipe(
      map(sessions => new AttendanceStats(sessions))
    ).subscribe(this.attendanceStats);
  }

}
