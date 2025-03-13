import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { DateTime } from 'luxon';
import { BehaviorSubject, combineLatest, filter, forkJoin, map, Observable, ReplaySubject, startWith, take, tap } from 'rxjs';
import { AttendanceEvent } from 'src/app/models/attendance-event.model';
import { MeetingEvent } from 'src/app/models/meeting-event.model';
import { Student } from 'src/app/models/student.model';
import { User } from 'src/app/models/user.model';
import { AttendanceService } from 'src/app/services/attendance.service';
import { MeetingsService } from 'src/app/services/meetings.service';
import { StudentsService } from 'src/app/services/students.service';
import { UsersService } from 'src/app/services/users.service';
import { PaginatedDataSource } from 'src/app/utils/PaginatedDataSource';
import { ConfirmDialogComponent } from 'src/app/components/reuse/confirm-dialog/confirm-dialog.component';
import { AuthService } from 'src/app/services/auth.service';
import { PermissionsService } from 'src/app/services/permissions.service';

interface EventLogEvent {
  eventId: string,
  student?: Student,
  registrar: User,
  event_type: string,
  date: DateTime,
  deleted: boolean,
  originalEvent: AttendanceEvent|MeetingEvent
};

enum PageState {
  LOADING = 1,
  LOADED
}

interface AttendanceAndMeetingData {
  attendance: Array<AttendanceEvent>,
  meetings: Array<MeetingEvent>
}

@Component({
    selector: 'app-event-log',
    templateUrl: './event-log.component.html',
    styleUrls: ['./event-log.component.scss'],
    standalone: false
})
export class EventLogComponent implements OnInit {
  readonly dateTimeShort = DateTime.DATETIME_SHORT;

  state = new BehaviorSubject<PageState>(PageState.LOADING);
  stateType = PageState;

  listOptions: FormGroup = new FormGroup({
    since: new FormControl(DateTime.now().set({hour: 0, minute: 0, second: 0, millisecond: 0}).minus({months: 1})),
    until: new FormControl(DateTime.now().set({hour: 0, minute: 0, second: 0, millisecond: 0}))
  });

  showActions = new ReplaySubject<boolean>(1);
  eventColumnSubject = new ReplaySubject<string[]>(1);

  events = new ReplaySubject<AttendanceAndMeetingData>(1);
  richEvents = new PaginatedDataSource<EventLogEvent>();

  constructor(
    private dialog: MatDialog,
    private attendanceService: AttendanceService,
    private studentsService: StudentsService,
    private usersService: UsersService,
    private meetingsService: MeetingsService,
    private permissionsService: PermissionsService
  ) {
    combineLatest({
      dates: this.listOptions.controls['until'].valueChanges.pipe(
        filter(it => it),
        map(it => ({since: this.listOptions.controls['since'].value, until: it})),
        startWith(this.listOptions.value),
        map(dates =>({since: dates.since, until: dates.until.plus({days: 1})}))
      ),
      showActions: this.showActions
    }).subscribe(({dates, showActions}) => {
      this.state.next(PageState.LOADING);
      forkJoin({
        attendance: this.attendanceService.getEvents({
          since: dates.since,
          until: dates.until,
          withTrashed: showActions
      }),
        meetings: this.meetingsService.getEvents(dates)
      }).subscribe(events => {
        this.events.next(events);
      })
    })

    this.events.subscribe(events => this.state.next(PageState.LOADED));

    this.showActions.subscribe(shouldShow => {
      if(shouldShow) {
        this.eventColumnSubject.next(["eventId", "studentId", "registrarId", "eventType", "eventDate", "eventAction"]);
      } else {
        this.eventColumnSubject.next(["eventId", "studentId", "registrarId", "eventType", "eventDate"]);
      }
    })

    permissionsService.checkPermissions(['delete attendance event']).subscribe(
      canDelete => this.showActions.next(canDelete));
  }

  ngOnInit(): void {
    combineLatest({
      events: this.events,
      students: this.studentsService.getAllStudents().pipe(
        map(students => new Map(students.map(student => [student.id, student])))
      ),
      users: this.usersService.getAllUsers().pipe(
        map(users => new Map(users.map(user => [user.id, user])))
      )
    }).pipe(
        map(({events, students, users}) => {
          let formattedAttendanceEvents: Array<EventLogEvent> = events.attendance.map(it => ({
            eventId: "a-" + it.id,
            student: students.get(it.student_id),
            registrar: users.get(it.registered_by)!!,
            event_type: it.type,
            date: it.created_at,
            deleted: it.deleted_at !== null,
            originalEvent: it
          }));
          let formattedMeetingEvents: Array<EventLogEvent> = events.meetings.map(it => ({
            eventId: "m-" + it.id,
            student: undefined,
            registrar: users.get(it.registered_by)!!,
            event_type: it.type,
            date: it.created_at,
            deleted: false,
            originalEvent: it
          }));

          let out = formattedAttendanceEvents.concat(formattedMeetingEvents);
          out.sort((a, b) => b.date.toMillis() - a.date.toMillis());
          return out;
        })
    ).subscribe((events) => {
      this.richEvents.setData(events);
    })
  }

  action(event: EventLogEvent) {
    if(event.event_type == 'check-in' || event.event_type == 'check-out') {
      const eventId: number = (event.originalEvent as AttendanceEvent).id;

      let action: Observable<AttendanceEvent>;
      if(event.deleted) {
        action = this.attendanceService.restoreEvent(eventId);
      } else {
        action = this.attendanceService.deleteEvent(eventId, {force: true});
      }

      forkJoin({
        events: this.events.pipe(take(1)),
        updatedEvent: action
      }).subscribe(({events, updatedEvent}) => {
        this.events.next({
          attendance: events.attendance.map(it => it.id == updatedEvent.id ? updatedEvent : it),
          meetings: events.meetings
        });
      });
    } else if(event.event_type == 'end-of-meeting') {
      const eventId: number = (event.originalEvent as MeetingEvent).id;

      let dialogref = this.dialog.open(ConfirmDialogComponent, {
        width: '320px',
        data: {action: 'Deletion', message: 'Event will be permanently deleted!', closeColor: 'warn'}
      });
      dialogref.afterClosed().subscribe((confirmed: boolean) => {
        if(!confirmed) {
          return;
        }
        forkJoin({
          events: this.events.pipe(take(1)),
          response: this.meetingsService.deleteEvent(eventId)
        }).subscribe(({events, response}) => {
          this.events.next({
            attendance: events.attendance,
            meetings: events.meetings.filter(it => it.id != eventId)
          });
        });
      });


    }
  }

}
