import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DateTime } from 'luxon';
import { forkJoin, map, ReplaySubject, Subject, switchMap, take } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/components/reuse/confirm-dialog/confirm-dialog.component';
import { SelectedDateRange } from 'src/app/components/reuse/date-picker/date-picker.component';
import { MeetingEvent, MeetingEventType } from 'src/app/models/meeting-event.model';
import { User } from 'src/app/models/user.model';
import { MeetingsService } from 'src/app/services/meetings.service';
import { PermissionsService } from 'src/app/services/permissions.service';
import { UsersService } from 'src/app/services/users.service';
import { PaginatedDataSource } from 'src/app/utils/PaginatedDataSource';

interface RichMeetingEvent {
  event: MeetingEvent,
  registrar: User
}

@Component({
    selector: 'app-meeting-events',
    templateUrl: './meeting-events.component.html',
    styleUrls: ['./meeting-events.component.scss'],
    standalone: false
})
export class MeetingEventsComponent implements OnInit {
  readonly dateTimeFormatShort = DateTime.DATETIME_SHORT;

  eventColumns = ["eventId", "registrar", "eventType", "eventDate"];

  dateRangeSelection = new Subject<SelectedDateRange>();

  loadingEvents = true;
  events = new ReplaySubject<Array<MeetingEvent>>(1);
  richMeetingEvents = new PaginatedDataSource<RichMeetingEvent>();

  constructor(
    private meetingsService: MeetingsService,
    private permissionsService: PermissionsService,
    private usersService: UsersService,
    private dialog: MatDialog,
  ) {
    this.dateRangeSelection.subscribe(dates => {
      this.loadingEvents = true;
      this.meetingsService.getEvents(dates).subscribe(events => {
        this.events.next(events);
      })
    });

    this.events.subscribe(events => {
      this.loadingEvents = false;
    });

    permissionsService.checkPermissions(['remove meeting events']).subscribe(isMentor => {
      if(isMentor) {
        this.eventColumns = this.eventColumns.concat('removeAction');
      }
    });
  }

  ngOnInit(): void {
    this.events.pipe(
      switchMap(events => {
        const userIds = [...new Set(events.map(event => event.registered_by))];
        return this.usersService.getSomeUsers(userIds).pipe(map(users => ({events, users})))
      }),
      map(({events, users}) => {
        return events.map(event => ({
          event,
          registrar: users.get(event.registered_by)
        } as RichMeetingEvent));
      })
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
        let dialogref = this.dialog.open(ConfirmDialogComponent, {
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
    let dialogref = this.dialog.open(ConfirmDialogComponent, {
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
}
