import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { DateTime } from 'luxon';
import { combineLatest, filter, forkJoin, map, Observable, ReplaySubject, startWith, take } from 'rxjs';
import { MeetingEvent, MeetingEventType } from 'src/app/models/meeting-event.model';
import { User } from 'src/app/models/user.model';
import { AuthService } from 'src/app/services/auth.service';
import { MeetingsService } from 'src/app/services/meetings.service';
import { UsersService } from 'src/app/services/users.service';
import { MeetingConfirmDialogComponent } from './meeting-confirm-dialog/meeting-confirm-dialog.component';

interface RichMeetingEvent {
  event: MeetingEvent,
  registrar: User
}

class MeetingDataSource implements DataSource<RichMeetingEvent> {
  private data: Array<RichMeetingEvent> = [];

  public readonly pageSizeOptions = [25, 50, 100];

  private paginatedData = new ReplaySubject<Array<RichMeetingEvent>>(1);

  private lastPageSize = this.pageSizeOptions[0];

  public setData(data: Array<RichMeetingEvent>): void {
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

  connect(collectionViewer: CollectionViewer): Observable<readonly RichMeetingEvent[]> {
    return this.paginatedData;
  }

  disconnect(collectionViewer: CollectionViewer): void {}
}

@Component({
  selector: 'app-meeting-events',
  templateUrl: './meeting-events.component.html',
  styleUrls: ['./meeting-events.component.scss']
})
export class MeetingEventsComponent implements OnInit {
  readonly dateTimeFormatShort = DateTime.DATETIME_SHORT;

  eventColumns = ["eventId", "registrar", "eventType", "eventDate"];

  meetingEventListOptions: FormGroup = new FormGroup({
    since: new FormControl(DateTime.now().minus({months: 1})),
    until: new FormControl(DateTime.now())
  });

  loadingEvents = true;
  events = new ReplaySubject<Array<MeetingEvent>>(1);
  richMeetingEvents = new MeetingDataSource();

  constructor(
    private meetingsService: MeetingsService,
    private authService: AuthService,
    private usersService: UsersService,
    private dialog: MatDialog,
  ) {
    this.meetingEventListOptions.controls['until'].valueChanges.pipe(
      filter(it => it),
      map(it => ({since: this.meetingEventListOptions.controls['since'].value, until: it})),
      startWith(this.meetingEventListOptions.value),
      map(dates => ({since: dates.since, until: dates.until.plus({days: 1})}))
    ).subscribe(dates => {
      this.loadingEvents = true;
      this.meetingsService.getEvents(dates).subscribe(events => {
        this.events.next(events);
      })
    });

    this.events.subscribe(events => {
      this.loadingEvents = false;
    });

    authService.checkHasAnyRole(['mentor']).subscribe(isMentor => {
      this.eventColumns = this.eventColumns.concat('removeAction');
    })
  }

  ngOnInit(): void {
    combineLatest({
      events: this.events,
      users: this.usersService.getAllUsers().pipe(
        map(users => new Map(users.map(user => [user.id, user])))
      )
    }).pipe(
      map(({events, users}) => events.map(event => ({
        event: event,
        registrar: users.get(event.registered_by)
      } as RichMeetingEvent)))
    ).subscribe(events => {
      this.richMeetingEvents.setData(events);
    });
  }

  registerEndOfMeeting(): void {
    let doRegistration = () => {
      forkJoin({
        events: this.events.pipe(take(1)),
        newEvent: this.meetingsService.registerEvent(MeetingEventType.END_OF_MEETING)
      }).pipe(
        map(({events, newEvent}) => [newEvent].concat(events))
      ).subscribe(events => this.events.next(events));
    };

    this.events.pipe(take(1)).subscribe(events => {
      const now = DateTime.now();
      // Prompt the user to confirm if an attempt is made to end a meeting within 6 hours of the
      // last end-of-meeting event.
      // FIXME: Abstract this magic number into a variable
      if(events.length > 0 && now.toMillis() - events[0].created_at.toMillis() < (6 * 60 * 60 * 1000)) {
        let dialogref = this.dialog.open(MeetingConfirmDialogComponent, {
          width: '320px',
          data: {
            action: 'End Meeting',
            message: 'Another meeting was recently ended at ' + events[0].created_at.toLocaleString(DateTime.DATETIME_SHORT),
            closeColor: 'primary'
          }
        });
        dialogref.afterClosed().subscribe(confirmed => {
          if(confirmed) {
            doRegistration();
          }
        })
      } else {
        // no need for confirmation
        doRegistration();
      }
    })
  }

  removeEvent(event: RichMeetingEvent): void {
    let dialogref = this.dialog.open(MeetingConfirmDialogComponent, {
      width: '320px',
      data: {action: 'Deletion', message: 'Event will be permanently deleted!', closeColor: 'warn'}
    });
    dialogref.afterClosed().subscribe((confirmed: boolean) => {
      if(!confirmed) {
        return;
      }
      this.meetingsService.deleteEvent(event.event.id).subscribe(result => {
        this.events.pipe(
          take(1),
          map(events => events.filter(it => it.id != event.event.id))
        ).subscribe(events => this.events.next(events));
      });
    });
  }

  notAllowedToEndMeetings(): Observable<boolean> {
    return this.authService.checkHasAnyRole(['mentor']).pipe(map(it => !it));
  }
}
