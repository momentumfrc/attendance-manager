import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, ReplaySubject, Subject, Subscription, switchMap, tap } from 'rxjs';
import { StudentStats } from 'src/app/models/report-models';
import { Student } from 'src/app/models/student.model';
import { ReportsService } from 'src/app/services/reports.service';
import { StudentsService } from 'src/app/services/students.service';
import { SelectedDateRange } from 'src/app/components/reuse/date-picker/date-picker.component';

interface StudentStatsReport {
  meeting_count: number,
  report: {
    student: Student,
    stats: StudentStats
  }[]
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
      meetings: this.dateRangeSelection.pipe(
        switchMap(range => this.reportsService.getMeetingList(range))
      ),
      stats: this.dateRangeSelection.pipe(
        switchMap(range => this.reportsService.getStudentStats(range))
      ),
      students: this.studentsService.getStudentMap(false)
    }).subscribe(({meetings, stats, students}) => {
        this.report.next({
          meeting_count: meetings.length,
          report: stats.map(stats => ({
            student: students.get(stats.student_id)!!,
            stats: stats
          })).filter(it => !!it.student)
        });
    });
  }

  ngOnDestroy(): void {
    this.reportSub?.unsubscribe();
  }

  updateDateSelection(selection: SelectedDateRange) {
    this.report.next(null);
    this.dateRangeSelection.next(selection);
  }

  formatTimeDiff(diffSeconds: number) {
    const hours = Math.floor(diffSeconds / (60 * 60));
    const minutes = Math.floor((diffSeconds % (60 * 60)) / 60);
    const seconds = diffSeconds % 60;
    return hours.toString()
      + ":" + minutes.toString().padStart(2, '0')
      + ":" + seconds.toString().padStart(2, '0');
  }
}
