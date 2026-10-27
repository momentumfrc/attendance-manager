import { Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, forkJoin, ReplaySubject, Subject, Subscription, switchMap } from 'rxjs';
import { SelectedDateRange } from 'src/app/components/reuse/date-picker/date-picker.component';
import { CsvColumn } from 'src/app/components/reuse/exportable-table/exportable-table.component';
import { StudentStats } from 'src/app/models/report-models';
import { Student } from 'src/app/models/student.model';
import { ReportsService } from 'src/app/services/reports.service';
import { StudentsService } from 'src/app/services/students.service';
import { formatTimeDiff } from 'src/app/utils/formatTimeDiff';

interface StudentStatsRow {
  student: Student,
  stats: StudentStats
}

interface StudentStatsReport {
  meeting_count: number,
  report: StudentStatsRow[],
  csvColumns: CsvColumn<StudentStatsRow>[]
};

@Component({
  selector: 'app-student-stats',
  templateUrl: './student-stats.component.html',
  styleUrl: './student-stats.component.scss',
  standalone: false
})
export class StudentStatsComponent implements OnInit, OnDestroy {
  studentStatsColumns = ["student-name", "checkin-count", "missed-checkout-count", "meeting-time"];

  dateRangeSelection = new Subject<SelectedDateRange>();

  report = new ReplaySubject<StudentStatsReport|null>(1);
  reportSub: Subscription|null = null;

  constructor(
    private studentsService: StudentsService,
    private reportsService: ReportsService
  ) {}

  ngOnInit(): void {
    this.reportSub = combineLatest({
      // Both requests are joined per range, so a fast response can't be paired with a stale one from the previous range
      range: this.dateRangeSelection.pipe(
        switchMap(range => forkJoin({
          meetings: this.reportsService.getMeetingList(range),
          stats: this.reportsService.getStudentStats(range)
        }))
      ),
      students: this.studentsService.getStudentMap(true)
    }).subscribe(({range: {meetings, stats}, students}) => {
        this.report.next({
          meeting_count: meetings.length,
          report: stats.map(stats => ({
            student: students.get(stats.student_id)!!,
            stats: stats
          })).filter(it => !!it.student),
          csvColumns: this.getCsvColumns(meetings.length)
        });
    });
  }

  getCsvColumns(meetingCount: number): CsvColumn<StudentStatsRow>[] {
    return [
      { header: 'student_id', value: row => row.student.id },
      { header: 'student_name', value: row => row.student.name },
      { header: 'meetings_attended', value: row => row.stats.checkin_count },
      { header: 'total_meetings', value: _ => meetingCount },
      { header: 'missed_checkouts', value: row => row.stats.missed_checkout_count },
      { header: 'meeting_time_seconds', value: row => row.stats.meeting_time }
    ];
  }

  ngOnDestroy(): void {
    this.reportSub?.unsubscribe();
  }

  updateDateSelection(selection: SelectedDateRange) {
    this.report.next(null);
    this.dateRangeSelection.next(selection);
  }

  readonly formatTimeDiff = formatTimeDiff;
}
