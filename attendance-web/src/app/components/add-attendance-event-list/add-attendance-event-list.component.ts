import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, forkJoin, interval, map, Observable, ReplaySubject, startWith, Subject, Subscription, switchMap, take } from 'rxjs';
import { PendingUpdate, PendingUpdateType, StudentsService } from 'src/app/services/students.service';
import { Student } from 'src/app/models/student.model';
import { AttendanceService } from 'src/app/services/attendance.service';
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { AttendanceEvent, AttendanceEventType } from 'src/app/models/attendance-event.model';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/services/auth.service';
import { MeetingEvent, MeetingEventType } from 'src/app/models/meeting-event.model';
import { MeetingsService } from 'src/app/services/meetings.service';

@Component({
  selector: 'app-add-attendance-event-list',
  templateUrl: './add-attendance-event-list.component.html',
  styleUrls: ['./add-attendance-event-list.component.scss']
})
export class AddAttendanceEventListComponent implements OnInit, AfterViewInit, OnDestroy {
  allStudents = new ReplaySubject<Array<Student>>(1);

  filteredStudents = new ReplaySubject<Array<Student>>(1);
  searchValue = new Subject<string>();

  lastEndOfMeeting = new ReplaySubject<MeetingEvent|null>(1);

  polling!: Subscription;
  meetingPolling!: Subscription;

  private studentsSub!: Subscription;

  protected readonly eventTypes = AttendanceEventType
  protected mode: AttendanceEventType

  constructor(
    private studentsService : StudentsService,
    private attendanceService : AttendanceService,
    private meetingsService : MeetingsService,
    private authService : AuthService,
    private dialog: MatDialog,
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
    // Get students from database
    // I can't directly just .subscribe(this.allStudents) because that will cause this.allStudents
    // to complete when the request finishes, but I want allStudents to be long-lived so it can
    // respond to updates
    this.studentsSub = this.studentsService.getAllStudents().subscribe((students) => this.allStudents.next(students));

    const updateMeetingEvent : (event: Array<MeetingEvent>) => void = events => {
      if(events.length > 0) {
        this.lastEndOfMeeting.next(events[0]);
      } else {
        this.lastEndOfMeeting.next(null);
      }
    };

    this.meetingsService.getEvents({limit: 1, type: MeetingEventType.END_OF_MEETING}).subscribe(updateMeetingEvent);

    // Set up polling for new check-ins/check-outs
    this.polling = interval(environment.pollInterval).pipe(
      switchMap(() => {
        const since = new Date();
        since.setSeconds(since.getSeconds() - (1 + (environment.pollInterval / 1000)));
        return forkJoin({
          updates: this.attendanceService.getEvents({since: since}),
          currentValue: this.allStudents.pipe(take(1))
        });
      }),
      map(({updates, currentValue}) => {
        updates.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
        const checkIns = updates.filter(it => it.type == AttendanceEventType.CHECK_IN);
        const checkOuts = updates.filter(it => it.type == AttendanceEventType.CHECK_OUT);
        return currentValue.map(student => {
          let newStudent : Student = {
            id: student.id,
            name: student.name,
            registered_by: student.registered_by,
            created_at: student.created_at,
            updated_at: student.updated_at,
            last_check_in: checkIns.find(item => item.student_id == student.id) ?? student.last_check_in,
            last_check_out: checkOuts.find(item => item.student_id == student.id) ?? student.last_check_out
          };
          return newStudent;
        });
      })
    ).subscribe((students) => this.allStudents.next(students));

    this.meetingPolling = interval(environment.pollInterval).pipe(
      switchMap(() => this.meetingsService.getEvents({limit: 1, type: MeetingEventType.END_OF_MEETING}))
    ).subscribe(updateMeetingEvent);

    // Combine search, sort filters, and student roster into the final observable which
    // will be formatted and shown to the user
    combineLatest({
      students: this.allStudents,
      search: this.searchValue.pipe(startWith("")),
      meeting: this.lastEndOfMeeting
    }).pipe(map(({students, search, meeting}) => {
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

        return a.name.localeCompare(b.name);
      });

      return value;
      })).subscribe(this.filteredStudents)
  }

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
    this.polling.unsubscribe();
    this.studentsSub.unsubscribe();
    this.meetingPolling.unsubscribe();
  }

  private attendance(student: Student, action: AttendanceEventType) : void {
    this.authService.getUser().pipe(map(user => {
      if(!user) {
        throw new Error("Not authenticated");
      }
      return user;
    })).subscribe(user => {
      let now = new Date();
      let dummyEvent : AttendanceEvent = {
        id: -1,
        student_id: student.id,
        registered_by: user.id,
        type: action,
        created_at: now,
        updated_at: now
      };

      let updatedStudent = structuredClone(student);

      switch(action){
        case AttendanceEventType.CHECK_IN:
          updatedStudent.last_check_in = dummyEvent;
          break;
        case AttendanceEventType.CHECK_OUT:
          updatedStudent.last_check_out = dummyEvent;
          break;
      };

        const eventStr = {
          [AttendanceEventType.CHECK_IN]: "checked in",
          [AttendanceEventType.CHECK_OUT]: "checked out"
        }[action];

        const snackBarHandle = this.snackbar.open(
          "Student " + student.name + " " + eventStr,
          "Undo",
          { duration: 4000 }
        );

        const pendingUpdate = new PendingUpdate(updatedStudent, PendingUpdateType.UPDATE,
          (update) => {
            return this.attendanceService.registerEvent(student.id, action).pipe(map(it => void 0));
          }
        );
        const updateId = this.studentsService.addPendingUpdate(pendingUpdate);

        const updateExecutor = snackBarHandle.afterDismissed().subscribe(() => {
          this.studentsService.commitPendingUpdate(updateId);
        });

        snackBarHandle.onAction().subscribe(() => {
          updateExecutor.unsubscribe();
          this.studentsService.clearPendingUpdate(updateId);
        });
    });
  }

  private shouldConsiderStudentCheckedIn(student: Student, meeting: MeetingEvent|null) {
    const check_in: Date|null = student.last_check_in?.updated_at ?? null;
    let check_out: Date|null = student.last_check_out?.updated_at ?? null;

    if(meeting != null) {
      if(check_out != null) {
        if(meeting.updated_at > check_out) {
          check_out = meeting.updated_at;
        }
      } else {
        check_out = meeting.updated_at;
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

  protected canPerformAction(student: Student): Observable<boolean> {
    return this.lastEndOfMeeting.pipe(
      map(meeting => this.shouldConsiderStudentCheckedIn(student, meeting)),
      map(isCheckedIn => (this.mode == AttendanceEventType.CHECK_IN) == isCheckedIn)
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
}
