import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { DateTime } from 'luxon';
import { BehaviorSubject, combineLatest, filter, map, Observable, ReplaySubject, startWith } from 'rxjs';
import { AttendanceEvent } from 'src/app/models/attendance-event.model';
import { Student } from 'src/app/models/student.model';
import { User } from 'src/app/models/user.model';
import { AttendanceService } from 'src/app/services/attendance.service';
import { StudentsService } from 'src/app/services/students.service';
import { UsersService } from 'src/app/services/users.service';

interface RichAttendanceEvent {
  event: AttendanceEvent,
  student: Student,
  registrar: User
};

enum PageState {
  LOADING = 1,
  LOADED
}

class EventDataSource implements DataSource<RichAttendanceEvent> {
  private data: Array<RichAttendanceEvent> = [];

  public readonly pageSizeOptions = [25, 50, 100];

  private paginatedData = new ReplaySubject<Array<RichAttendanceEvent>>(1);

  private lastPageSize = this.pageSizeOptions[0];

  public setData(data: Array<RichAttendanceEvent>): void {
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

  connect(collectionViewer: CollectionViewer): Observable<readonly RichAttendanceEvent[]> {
    return this.paginatedData;
  }

  disconnect(collectionViewer: CollectionViewer): void {}
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

  events = new ReplaySubject<Array<AttendanceEvent>>(1);
  richEvents = new EventDataSource();

  constructor(
    private attendanceService: AttendanceService,
    private studentsService: StudentsService,
    private usersService: UsersService
  ) {
    this.listOptions.controls['until'].valueChanges.pipe(
      filter(it => it),
      map(it => ({since: this.listOptions.controls['since'].value, until: it})),
      startWith(this.listOptions.value),
      map(dates =>({since: dates.since, until: dates.until.plus({days: 1})}))
    ).subscribe(dates => {
      this.state.next(PageState.LOADING);
      this.attendanceService.getEvents(dates).subscribe(events => {
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
        map(({events, students, users}) => events.map(event => ({
          event: event,
          student: students.get(event.student_id),
          registrar: users.get(event.registered_by)
        } as RichAttendanceEvent))
      )
    ).subscribe((events) => {
      this.richEvents.setData(events);
    })
  }

}
