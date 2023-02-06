import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Chart } from 'chart.js/auto';
import 'chartjs-adapter-luxon';
import { DateTime, Interval } from 'luxon';
import { BehaviorSubject, combineLatest, filter, map, ReplaySubject, share, startWith, tap } from 'rxjs';
import { MeetingStatistic } from 'src/app/models/meeting-statistic.model';
import { ReportsService } from 'src/app/services/reports.service';

enum PageState {
  LOADING = 1,
  LOADED
}

@Component({
  selector: 'app-meetings',
  templateUrl: './meetings-report.component.html',
  styleUrls: ['./meetings-report.component.scss']
})
export class MeetingsReportComponent {
  readonly dateFormat = DateTime.DATE_SHORT;

  meetingStatsColumns = ['date', 'student-count'];

  state = new BehaviorSubject<PageState>(PageState.LOADING);
  stateType = PageState

  dataDateRange: FormGroup = new FormGroup({
    since: new FormControl(DateTime.now().minus({months: 1})),
    until: new FormControl(DateTime.now())
  });

  selectedInterval = new ReplaySubject<Interval>(1);
  meetingData = new ReplaySubject<Array<MeetingStatistic>>(1);

  chart?: Chart = undefined

  constructor(private reportsService: ReportsService) {
    this.dataDateRange.controls['until'].valueChanges.pipe(
      filter(it => it),
      map(it => ({since: this.dataDateRange.controls['since'].value, until: it})),
      startWith(this.dataDateRange.value),
      map(dates => ({since: dates.since, until: dates.until.plus({days: 1})}))
    ).subscribe(({since, until}) => this.selectedInterval.next(Interval.fromDateTimes(since, until)));

    this.selectedInterval.subscribe(interval => {
      this.state.next(PageState.LOADING);
      this.reportsService.getMeetingStats({since: interval.start, until: interval.end}).subscribe(stats => {
        this.meetingData.next(stats);
      })
    })

    this.meetingData.subscribe(_ => this.state.next(PageState.LOADED));

    combineLatest({
      dates: this.selectedInterval,
      stats: this.meetingData
    }).subscribe(({dates, stats}) => {
      const statsByDate = new Map(stats.map(it => [it.meeting_date.toMillis(), it]));
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
          min: dates.start.toMillis(),
          max: dates.end.toMillis()
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
}
