import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DateTime } from 'luxon';
import { BehaviorSubject, combineLatest, filter, map, Observable, of, ReplaySubject, shareReplay, startWith, Subject, switchMap, takeUntil } from 'rxjs';
import { AttendanceSession } from 'src/app/models/attendance-session.model';
import { MeetingAttendance, MeetingStudentCount } from 'src/app/models/report-models';
import { Student } from 'src/app/models/student.model';
import { User } from 'src/app/models/user.model';
import { AttendanceService } from 'src/app/services/attendance.service';
import { AuthService } from 'src/app/services/auth.service';
import { ErrorService } from 'src/app/services/error.service';
import { PermissionsService } from 'src/app/services/permissions.service';
import { ReportsService } from 'src/app/services/reports.service';
import { StudentsService } from 'src/app/services/students.service';
import { UsersService } from 'src/app/services/users.service';
import { PaginatedDataSource } from 'src/app/utils/PaginatedDataSource';
import { environment } from 'src/environments/environment';
import { SelectedDateRange } from 'src/app/components/reuse/date-picker/date-picker.component';

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
    public sessions: Array<AttendanceSession>,
    public allMeetings: Array<MeetingStudentCount>
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

@Component({
    selector: 'app-show-student',
    templateUrl: './show-student.component.html',
    styleUrls: ['./show-student.component.scss'],
    standalone: false
})
export class ShowStudentComponent implements OnInit, OnDestroy {
  readonly dateTimeShort = DateTime.DATETIME_SHORT;

  protected stateType = PageState;
  protected state = new BehaviorSubject<PageState>(PageState.STUDENT_LOADING);

  protected student = new ReplaySubject<Student>(1)
  protected registeredBy = new ReplaySubject<User>(1)

  protected sessionsSubject = new ReplaySubject<AttendanceSession[]>(1);
  protected meetingsSubject = new ReplaySubject<MeetingStudentCount[]>(1);

  protected attendanceSessions = new PaginatedDataSource<RichAttendanceSession>()
  protected attendanceStats = new ReplaySubject<AttendanceStats>(1)

  protected dateRangeChanges = new Subject<SelectedDateRange>();

  protected sessionColumns = ["checkInDate", "checkOutDate", "duration"];

  protected destructNotifier = new Subject<void>();

  constructor(
    studentService: StudentsService,
    route: ActivatedRoute,
    private usersService: UsersService,
    private attendanceService: AttendanceService,
    private errorService: ErrorService,
    private permissionsService: PermissionsService,
    private reportsService: ReportsService
  ) {
    const studentId = parseInt(route.snapshot.paramMap.get('studentId') ?? 'NaN' );
    let studentRequest: Observable<Student|null>;
    if(studentId) {
      studentRequest = studentService.getStudent(studentId).pipe(
        takeUntil(this.destructNotifier),
        // Stupid freaking javascript defining null and undefined as two different things!
        // This converts the Observable<Student|undefined> => Observable<Student|null>
        map(it => it ? it : null)
      )
    } else {
      studentRequest = of(null);
    }

    const sharedStudentRequest = studentRequest.pipe(shareReplay(1));
    sharedStudentRequest.subscribe((student) => {
      if(student) {
        this.state.next(PageState.STUDENT_FOUND);
      } else {
        this.state.next(PageState.STUDENT_NOT_FOUND);
      }
    })
    sharedStudentRequest.pipe(
      filter((it): it is Student => !!it),
    ).subscribe(this.student);
  }

  ngOnInit(): void {
    this.student.pipe(
      switchMap(it => this.usersService.getUser(it.registered_by))
    ).subscribe(this.registeredBy);

    combineLatest({
      dateRange: this.dateRangeChanges,
      student: this.student
    }).pipe(
      switchMap(({dateRange, student}) => this.attendanceService.getSessions({
        forStudentId: student.id,
        since: dateRange.since,
        until: dateRange.until
      }))
    ).subscribe(sessions => this.sessionsSubject.next(sessions));

    this.sessionsSubject.pipe(
      map(sessions => sessions.map(session => new RichAttendanceSession(session))),
    ).subscribe((sessions) => {
      this.attendanceSessions.setData(sessions);
    });

    this.dateRangeChanges.pipe(
      switchMap(dateRange => this.reportsService.getMeetingList(dateRange))
    ).subscribe(meetings => this.meetingsSubject.next(meetings));

    combineLatest({
      sessions: this.sessionsSubject,
      meetings: this.meetingsSubject
    }).pipe(
      map(({sessions, meetings}) => new AttendanceStats(sessions, meetings))
    ).subscribe(this.attendanceStats);
  }

  ngOnDestroy(): void {
    this.destructNotifier.next();
  }

  isDeleted(): Observable<boolean> {
    return this.student.pipe(map(student => student.deleted_at != null));
  }

  canDelete(): Observable<boolean> {
    return this.permissionsService.checkPermissions(['modify students', 'modify student images', 'remove students']);
  }

  getProfileImageSrc(student: Student): string {
    return environment.apiRoot + '/storage/student_profiles/' + student.profile_image?.basename;
  }

}
