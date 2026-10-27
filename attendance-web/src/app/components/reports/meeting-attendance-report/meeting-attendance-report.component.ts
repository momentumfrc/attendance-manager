import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DateTime } from 'luxon';
import { ReplaySubject, Subscription, combineLatest } from 'rxjs';
import { CsvColumn } from 'src/app/components/reuse/exportable-table/exportable-table.component';
import { Student } from 'src/app/models/student.model';
import { ReportsService } from 'src/app/services/reports.service';
import { StudentsService } from 'src/app/services/students.service';

interface MeetingAttendanceSession {
  student: Student,
  checkin_date: DateTime,
  checkout_date: DateTime|null
}

interface MeetingAttendanceReport {
  date: DateTime,
  attendance_sessions: MeetingAttendanceSession[]
};

@Component({
    selector: 'app-meeting-attendance-report',
    templateUrl: './meeting-attendance-report.component.html',
    styleUrl: './meeting-attendance-report.component.scss',
    standalone: false
})
export class MeetingAttendanceReportComponent implements OnInit, OnDestroy {
  DATE_SHORT_FMT = DateTime.DATE_SHORT;
  DATETIME_SHORT_FMT = DateTime.DATETIME_SHORT;

  meetingAttendanceColumns = ["student-name", "checkin-date", "checkout-date"];
  csvColumns: CsvColumn<MeetingAttendanceSession>[] = [
    { header: 'student_id', value: session => session.student.id },
    { header: 'student_name', value: session => session.student.name },
    { header: 'checkin_at', value: session => session.checkin_date.toISO() },
    { header: 'checkout_at', value: session => session.checkout_date?.toISO() }
  ];

  report = new ReplaySubject<MeetingAttendanceReport>(1);

  reportSub: Subscription|null = null;

  constructor(
    private route: ActivatedRoute,
    private reportsService: ReportsService,
    private studentsService: StudentsService
  ) {}

  ngOnInit(): void {
    const dateStr: string|null = this.route.snapshot.paramMap.get('date');
    const date: DateTime|null = dateStr ? DateTime.fromISO(dateStr) : null;

    this.reportSub = combineLatest({
      attendance: this.reportsService.getMeetingAttendance({meeting_date: date ?? undefined}),
      students: this.studentsService.getStudentMap(true)
    }).subscribe(({attendance, students}) => {
      let mappedSessions = attendance.attendance_sessions.map(session => ({
        student: students.get(session.student_id) as Student,
        checkin_date: session.checkin_date,
        checkout_date: session.checkout_date
      })).filter(it => !!it.student);
      let report = {
        date: attendance.meeting_date,
        attendance_sessions: mappedSessions
      };
      this.report.next(report);
    });

  }

  ngOnDestroy(): void {
    if(this.reportSub) {
      this.reportSub.unsubscribe();
      this.reportSub = null;
    }
  }
}
