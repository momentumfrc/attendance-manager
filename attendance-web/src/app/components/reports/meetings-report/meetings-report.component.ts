import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Chart } from 'chart.js/auto';
import { DateTime } from 'luxon';
import { BehaviorSubject, filter, map, ReplaySubject, startWith } from 'rxjs';
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

  meetingData = new ReplaySubject<Array<MeetingStatistic>>(1);

  chart?: Chart = undefined

  constructor(private reportsService: ReportsService) {
    this.dataDateRange.controls['until'].valueChanges.pipe(
      filter(it => it),
      map(it => ({since: this.dataDateRange.controls['since'].value, until: it})),
      startWith(this.dataDateRange.value),
      map(dates => ({since: dates.since, until: dates.until.plus({days: 1})}))
    ).subscribe(dates => {
      this.state.next(PageState.LOADING);
      this.reportsService.getMeetingStats(dates).subscribe(stats => {
        this.meetingData.next(stats);
      })
    })

    this.meetingData.subscribe(_ => this.state.next(PageState.LOADED));

    this.meetingData.subscribe(stats => {
      const data = {
        labels: stats.map(it => it.meeting_date.toLocaleString(DateTime.DATE_SHORT)),
        datasets: [{
          label: 'Student Count',
          data: stats.map(it => it.student_count)
        }]
      };
      if(this.chart) {
        this.chart.data = data;
        this.chart.update();
      } else {
        this.chart = new Chart('lineChart', {
          type: 'line',
          data: data,
          options: {
            scales: {
              y: {
                min: 0
              }
            }
          }
        });
      }
    });
  }
}
