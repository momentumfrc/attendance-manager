import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, catchError, combineLatest, finalize, forkJoin, interval, map, Observable, of, ReplaySubject, shareReplay, startWith, Subject, Subscription, switchMap, take, tap, timer } from 'rxjs';
import { StudentsService } from 'src/app/services/students.service';
import { Student, StudentList, compareStudents } from 'src/app/models/student.model';
import { AttendanceService } from 'src/app/services/attendance.service';
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { AttendanceEvent, AttendanceEventType } from 'src/app/models/attendance-event.model';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/services/auth.service';
import { MeetingEvent, MeetingEventType } from 'src/app/models/meeting-event.model';
import { MeetingsService } from 'src/app/services/meetings.service';
import { DateTime } from 'luxon';
import { PollService } from 'src/app/services/poll.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorService } from 'src/app/services/error.service';

@Component({
  selector: 'app-add-attendance-event-list',
  templateUrl: './add-attendance-event-list.component.html',
  styleUrls: ['./add-attendance-event-list.component.scss']
})
export class AddAttendanceEventListComponent implements OnInit, AfterViewInit, OnDestroy {
  allStudents = new ReplaySubject<Array<Student>>(1);

  filteredStudents = new ReplaySubject<[StudentList, boolean[]]>(1);
  searchValue = new Subject<string>();

  lastEndOfMeeting = new ReplaySubject<MeetingEvent|null>(1);

  polling!: Subscription;

  private studentsSub!: Subscription;

  protected readonly eventTypes = AttendanceEventType
  protected mode: AttendanceEventType

  protected pendingStudentIds = new BehaviorSubject<number[]>([]);
  protected inUpdateLockout = new BehaviorSubject<boolean>(false);

  constructor(
    private pollService: PollService,
    private studentsService : StudentsService,
    private attendanceService : AttendanceService,
    private meetingsService : MeetingsService,
    private authService : AuthService,
    private errorService: ErrorService,
    private snackbar: MatSnackBar,
    route: ActivatedRoute
  ) {
    if(route.snapshot.url[0].path == 'check-in') {
      this.mode = AttendanceEventType.CHECK_IN;
    } else {
      this.mode = AttendanceEventType.CHECK_OUT;
    }
  }

  ngOnInit(): void {
    this.studentsSub = this.studentsService.getAllStudents(false).subscribe(this.allStudents);

    this.meetingsService.getEvents({limit: 1, type: MeetingEventType.END_OF_MEETING}).subscribe(events => {
      if(events.length > 0) {
        this.lastEndOfMeeting.next(events[0]);
      } else {
        this.lastEndOfMeeting.next(null);
      }
    });

    // Set up polling for new check-ins/check-outs
    this.polling = this.pollService.getPollingObservable().subscribe(pollData => {
      // If we get new data, disable the UI for a configurable period (in case a user is about
      // to tap an option that will move with the update)
      let shouldLockout: Observable<boolean>;
      if(pollData.meeting_events.length > 0) {
        shouldLockout = of(true);
      } else if(pollData.updated_students.length > 0) {
        shouldLockout = this.studentsService.matchesCache(pollData.updated_students).pipe(map(matches => !matches));
      } else {
        shouldLockout = of(false);
      }

      shouldLockout.subscribe(shouldLockout => {
        if(shouldLockout) {
          this.inUpdateLockout.next(true);
          timer(environment.updateLockoutInterval).subscribe(() => {
            this.inUpdateLockout.next(false);
          });

          this.studentsService.updateStudentsInCache(pollData.updated_students);
          if(pollData.meeting_events.length > 0) {
            // TODO: Verify that the 0th meeting event is always the most recent
            this.lastEndOfMeeting.next(pollData.meeting_events[0]);
          }
        }
      });
    });

    // Combine search, sort filters, and student roster into the final observable which
    // will be formatted and shown to the user
    combineLatest({
      students: this.allStudents,
      search: this.searchValue.pipe(startWith("")),
      meeting: this.lastEndOfMeeting,
      pendingStudentIds: this.pendingStudentIds
    }).pipe(map(({students, search, meeting, pendingStudentIds}) => {
      let searchLc = (search ?? "").toLocaleLowerCase();

      let value = students;

      // implement search
      if(searchLc != "") {
        value = value.filter(student => student.name.toLocaleLowerCase().includes(searchLc));
      }

      // implement sort
      value.sort((a: Student, b: Student) => {
        const aCheckedIn = this.shouldConsiderStudentCheckedIn(a, meeting);
        const bCheckedIn = this.shouldConsiderStudentCheckedIn(b, meeting);

        if(aCheckedIn != bCheckedIn) {
          if(aCheckedIn) {
            return this.mode == this.eventTypes.CHECK_IN ? 1 : -1;
          } else {
            return this.mode == this.eventTypes.CHECK_IN ? -1 : 1;
          }
        }

        return compareStudents(a, b);
      });

      // flag pending students
      const isPending = value.map(student => pendingStudentIds.includes(student.id));

      return [new StudentList(value), isPending] as [StudentList, boolean[]];
    })).subscribe(this.filteredStudents)
  }

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
    this.polling.unsubscribe();
    this.studentsSub.unsubscribe();
  }

  private getValidRoles(): string[] {
    let validRoles = ['mentor'];
    if(this.mode == AttendanceEventType.CHECK_IN) {
      validRoles.push('student-lead');
    }
    return validRoles;
  }

  private attendance(student: Student, action: AttendanceEventType) : void {
    // If we're locked-out due to a recent update, ignore the event
    if(this.inUpdateLockout.getValue()) {
      return;
    }

    this.pendingStudentIds.next(this.pendingStudentIds.getValue().concat([student.id]));

    this.authService.getUser().pipe(map(user => {
      if(!user) {
        throw new Error("Not authenticated");
      }
      return user;
    })).subscribe(user => {
      let validRoles = this.getValidRoles();
      let authorized = user.role_names.find(it => validRoles.includes(it)) != undefined;
      if(!authorized) {
        this.snackbar.open(
          "You are not authorized to perform this action",
          undefined,
          { duration: 4000 }
        );
        this.pendingStudentIds.next(this.pendingStudentIds.getValue().filter(id => id != student.id));
        return;
      }

        const eventStr = {
          [AttendanceEventType.CHECK_IN]: "checked in",
          [AttendanceEventType.CHECK_OUT]: "checked out"
        }[action];

        this.attendanceService.registerEvent(student.id, action, {catchErrors: false}).pipe(
          catchError((error: HttpErrorResponse) => {
            if(error.status == 422) {
              console.log("Detected simultaneous attendance events. Ignoring recently entered event.");
              return of(null);
            }
            throw error;
          }),
          this.errorService.interceptErrors()
        ).subscribe(event => {
          this.studentsService.refreshSingleStudent(student.id).pipe(
            finalize(() => {
              this.pendingStudentIds.next(this.pendingStudentIds.getValue().filter(it => it != student.id));
            })
          ).subscribe(() => {});
          if(event) {
            const snackBarHandle = this.snackbar.open(
              "Student " + student.name + " " + eventStr,
              "Undo",
              { duration: 4000 }
            );

            snackBarHandle.onAction().subscribe(() => {
              this.pendingStudentIds.next(this.pendingStudentIds.getValue().concat([student.id]));
              this.attendanceService.deleteEvent(event.id).pipe(
                finalize(() => {
                  this.pendingStudentIds.next(this.pendingStudentIds.getValue().filter(it => it != student.id));
                })
              ).subscribe(deleted => {
                if(deleted) {
                  this.studentsService.refreshSingleStudent(event.student_id);
                }
              });
            });
          }
        });

    });
  }

  private shouldConsiderStudentCheckedIn(student: Student, meeting: MeetingEvent|null) {
    const check_in: DateTime|null = student.last_check_in?.created_at ?? null;
    let check_out: DateTime|null = student.last_check_out?.created_at ?? null;

    if(meeting != null) {
      if(check_out != null) {
        if(meeting.created_at > check_out) {
          check_out = meeting.created_at;
        }
      } else {
        check_out = meeting.created_at;
      }
    }


    if(check_in == null) {
      return false;
    }

    if(check_out == null) {
      return true;
    }

    return check_out < check_in;
  }

  protected cannotPerformAction(student: Student): Observable<boolean> {
    return combineLatest({
      availableActionDoesNotMatchTab: this.lastEndOfMeeting.pipe(
          map(meeting => this.shouldConsiderStudentCheckedIn(student, meeting)),
          map(isCheckedIn => (this.mode == AttendanceEventType.CHECK_IN) == isCheckedIn)
      ),
      isPending: this.pendingStudentIds.pipe(
        map(ids => ids.includes(student.id))
      ),
      inUpdateLockout: this.inUpdateLockout
    }).pipe(
      map(({availableActionDoesNotMatchTab, isPending, inUpdateLockout}) => availableActionDoesNotMatchTab || isPending || inUpdateLockout)
    );
  }

  protected actionText(): string {
    return {
      [AttendanceEventType.CHECK_IN]: "Check In",
      [AttendanceEventType.CHECK_OUT]: "Check Out"
    }[this.mode];
  }

  protected actionColor(): string {
    return {
      [AttendanceEventType.CHECK_IN]: "primary",
      [AttendanceEventType.CHECK_OUT]: "accent"
    }[this.mode];
  }

  protected performAction(student: Student) {
    this.attendance(student, this.mode);
  }

  protected notAuthorized(): Observable<boolean> {
    return this.authService.checkHasAnyRole(this.getValidRoles()).pipe(map(it => !it));
  }
}
