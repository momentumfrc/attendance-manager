import { Component, OnDestroy, OnInit } from '@angular/core';
import { DateTime } from 'luxon';
import { combineLatest, ReplaySubject, Subject, Subscription, switchMap } from 'rxjs';
import { SelectedDateRange } from 'src/app/components/reuse/date-picker/date-picker.component';
import { CsvColumn } from 'src/app/components/reuse/exportable-table/exportable-table.component';
import { AttendanceSession } from 'src/app/models/attendance-session.model';
import { Student } from 'src/app/models/student.model';
import { AttendanceService } from 'src/app/services/attendance.service';
import { StudentsService } from 'src/app/services/students.service';
import { formatTimeDiff } from 'src/app/utils/formatTimeDiff';

export interface AttendanceSessionRow {
  student?: Student,
  session: AttendanceSession,
  durationSeconds: number|null
}

@Component({
  selector: 'app-attendance-sessions',
  templateUrl: './attendance-sessions.component.html',
  styleUrl: './attendance-sessions.component.scss',
  standalone: false
})
export class AttendanceSessionsComponent implements OnInit, OnDestroy {
  readonly dateTimeShort = DateTime.DATETIME_SHORT;

  readonly sessionColumns = ["student", "checkInDate", "checkOutDate", "duration"];
  readonly csvColumns: CsvColumn<AttendanceSessionRow>[] = [
    { header: 'student_id', value: row => row.session.student_id },
    { header: 'student_name', value: row => row.student?.name },
    { header: 'checkin_at', value: row => row.session.checkin_date.toISO() },
    { header: 'checkout_at', value: row => row.session.checkout_date?.toISO() },
    { header: 'duration_seconds', value: row => row.durationSeconds }
  ];

  dateRangeSelection = new Subject<SelectedDateRange>();

  sessions = new ReplaySubject<AttendanceSessionRow[]|null>(1);
  sessionsSub: Subscription|null = null;

  constructor(
    private attendanceService: AttendanceService,
    private studentsService: StudentsService
  ) {}

  ngOnInit(): void {
    this.sessionsSub = combineLatest({
      sessions: this.dateRangeSelection.pipe(
        switchMap(range => this.attendanceService.getSessions(range))
      ),
      students: this.studentsService.getStudentMap(true)
    }).subscribe(({sessions, students}) => {
      this.sessions.next(sessions
        .map(session => ({
          student: students.get(session.student_id),
          session,
          durationSeconds: session.checkout_date
            ? Math.floor((session.checkout_date.toMillis() - session.checkin_date.toMillis()) / 1000)
            : null
        }))
        .sort((a, b) => b.session.checkin_date.toMillis() - a.session.checkin_date.toMillis()));
    });
  }

  ngOnDestroy(): void {
    this.sessionsSub?.unsubscribe();
  }

  updateDateSelection(selection: SelectedDateRange) {
    this.sessions.next(null);
    this.dateRangeSelection.next(selection);
  }

  formatDuration(row: AttendanceSessionRow): string {
    return row.durationSeconds == null ? "-" : formatTimeDiff(row.durationSeconds);
  }
}
