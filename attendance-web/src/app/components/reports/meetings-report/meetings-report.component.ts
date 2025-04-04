import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Chart } from 'chart.js/auto';
import 'chartjs-adapter-luxon';
import { DateTime, Interval } from 'luxon';
import { BehaviorSubject, combineLatest, filter, map, ReplaySubject, share, startWith, Subject, tap } from 'rxjs';
import { MeetingStudentCount } from 'src/app/models/report-models';
import { ReportsService } from 'src/app/services/reports.service';
import { SelectedDateRange } from '../../reuse/date-picker/date-picker.component';

enum PageState {
  LOADING = 1,
  LOADED
}

@Component({
    selector: 'app-meetings',
    templateUrl: './meetings-report.component.html',
    styleUrls: ['./meetings-report.component.scss'],
    standalone: false
})
export class MeetingsReportComponent {
  readonly dateFormat = DateTime.DATE_SHORT;

  meetingStatsColumns = ['attendance-detail', 'date', 'student-count'];

  state = new BehaviorSubject<PageState>(PageState.LOADING);
  stateType = PageState

  dateRangeSelection = new Subject<SelectedDateRange>();

  selectedInterval = new ReplaySubject<Interval>(1);
  meetingData = new ReplaySubject<Array<MeetingStudentCount>>(1);

  chart?: Chart = undefined

  constructor(private reportsService: ReportsService) {
    this.dateRangeSelection.subscribe(({since, until}) => this.selectedInterval.next(Interval.fromDateTimes(since, until)));

    this.selectedInterval.subscribe(interval => {
      this.state.next(PageState.LOADING);
      this.reportsService.getMeetingList({since: interval.start ?? undefined, until: interval.end ?? undefined}).subscribe(stats => {
        this.meetingData.next(stats);
      })
    })

    this.meetingData.subscribe(_ => this.state.next(PageState.LOADED));

    combineLatest({
      dates: this.selectedInterval,
      stats: this.meetingData
    }).subscribe(({dates, stats}) => {
      const data = {
        datasets: [{
          label: 'Student Count',
          data: stats.map(stat => ({x: stat.meeting_date.toMillis(), y:stat.student_count}))
        }]
      };
      const scales: any = {
        x: {
          type: 'time',
          time: {
            unit: 'week'
          },
          min: dates.start?.toMillis(),
          max: dates.end?.toMillis()
        },
        y: {
          min: 0
        }
      }
      if(this.chart) {
        this.chart.data = data;
        this.chart.options.scales = scales;
        this.chart.update();
      } else {
        this.chart = new Chart('lineChart', {
          type: 'bar',
          data: data,
          options: {
            scales: scales
          }
        });
      }
    });
  }

  clog(arg: any) {
    console.log(arg);
  }
}
