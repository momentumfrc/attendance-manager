import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { BehaviorSubject, combineLatest, debounceTime, filter, map, ReplaySubject, startWith, tap, withLatestFrom } from 'rxjs';
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

@Component({
  selector: 'app-event-log',
  templateUrl: './event-log.component.html',
  styleUrls: ['./event-log.component.scss']
})
export class EventLogComponent implements OnInit, AfterViewInit {

  state = new BehaviorSubject<PageState>(PageState.LOADING);
  stateType = PageState;

  listOptions: FormGroup

  eventColumns = ["eventId", "studentId", "registrarId", "eventType", "eventDate"];

  events = new ReplaySubject<Array<AttendanceEvent>>(1);
  richEvents = new MatTableDataSource<RichAttendanceEvent>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private attendanceService: AttendanceService,
    private studentsService: StudentsService,
    private usersService: UsersService
  ) {
    let startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    this.listOptions = new FormGroup({
      since: new FormControl(startDate),
      until: new FormControl(new Date())
    });

    this.listOptions.controls['until'].valueChanges.pipe(
      filter(it => it),
      map(it => ({since: this.listOptions.controls['since'].value, until: it})),
      startWith(this.listOptions.value),
      map(dates => {
        let endDate : Date = dates.until;
        endDate.setDate(endDate.getDate() + 1);
        return {since: dates.since, until: endDate};
      })
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
      this.richEvents.data = events;
    })
  }

  ngAfterViewInit(): void {
    this.richEvents.paginator = this.paginator;
  }

}
