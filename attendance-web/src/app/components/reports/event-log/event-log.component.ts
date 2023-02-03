import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { DateTime } from 'luxon';
import { BehaviorSubject, combineLatest, filter, forkJoin, map, Observable, ReplaySubject, startWith } from 'rxjs';
import { AttendanceEvent } from 'src/app/models/attendance-event.model';
import { MeetingEvent } from 'src/app/models/meeting-event.model';
import { Student } from 'src/app/models/student.model';
import { User } from 'src/app/models/user.model';
import { AttendanceService } from 'src/app/services/attendance.service';
import { MeetingsService } from 'src/app/services/meetings.service';
import { StudentsService } from 'src/app/services/students.service';
import { UsersService } from 'src/app/services/users.service';

interface EventLogEvent {
  eventId: string,
  student?: Student,
  registrar: User,
  event_type: string,
  date: DateTime
};

enum PageState {
  LOADING = 1,
  LOADED
}

class EventDataSource implements DataSource<EventLogEvent> {
  private data: Array<EventLogEvent> = [];

  public readonly pageSizeOptions = [25, 50, 100];

  private paginatedData = new ReplaySubject<Array<EventLogEvent>>(1);

  private lastPageSize = this.pageSizeOptions[0];

  public setData(data: Array<EventLogEvent>): void {
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

  connect(collectionViewer: CollectionViewer): Observable<readonly EventLogEvent[]> {
    return this.paginatedData;
  }

  disconnect(collectionViewer: CollectionViewer): void {}
}

interface AttendanceAndMeetingData {
  attendance: Array<AttendanceEvent>,
  meetings: Array<MeetingEvent>
}

@Component({
  selector: 'app-event-log',
  templateUrl: './event-log.component.html',
  styleUrls: ['./event-log.component.scss']
})
export class EventLogComponent implements OnInit {
  readonly dateTimeShort = DateTime.DATETIME_SHORT;

  state = new BehaviorSubject<PageState>(PageState.LOADING);
  stateType = PageState;

  listOptions: FormGroup = new FormGroup({
    since: new FormControl(DateTime.now().minus({months: 1})),
    until: new FormControl(DateTime.now())
  });

  eventColumns = ["eventId", "studentId", "registrarId", "eventType", "eventDate"];

  events = new ReplaySubject<AttendanceAndMeetingData>(1);
  richEvents = new EventDataSource();

  constructor(
    private attendanceService: AttendanceService,
    private studentsService: StudentsService,
    private usersService: UsersService,
    private meetingsService: MeetingsService
  ) {
    this.listOptions.controls['until'].valueChanges.pipe(
      filter(it => it),
      map(it => ({since: this.listOptions.controls['since'].value, until: it})),
      startWith(this.listOptions.value),
      map(dates =>({since: dates.since, until: dates.until.plus({days: 1})}))
    ).subscribe(dates => {
      this.state.next(PageState.LOADING);
      forkJoin({
        attendance: this.attendanceService.getEvents(dates),
        meetings: this.meetingsService.getEvents(dates)
      }).subscribe(events => {
        this.events.next(events);
      })
    })

    this.events.subscribe(events => this.state.next(PageState.LOADED));
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
            date: it.created_at
          }));
          let formattedMeetingEvents: Array<EventLogEvent> = events.meetings.map(it => ({
            eventId: "m-" + it.id,
            student: undefined,
            registrar: users.get(it.registered_by)!!,
            event_type: it.type,
            date: it.created_at
          }));

          let out = formattedAttendanceEvents.concat(formattedMeetingEvents);
          out.sort((a, b) => b.date.toMillis() - a.date.toMillis());
          return out;
        })
    ).subscribe((events) => {
      this.richEvents.setData(events);
    })
  }

}
