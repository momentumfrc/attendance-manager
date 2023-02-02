import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Chart } from 'chart.js/auto';
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
  meetingStatsColumns = ['date', 'student-count'];

  state = new BehaviorSubject<PageState>(PageState.LOADING);
  stateType = PageState

  dataDateRange: FormGroup

  meetingData = new ReplaySubject<Array<MeetingStatistic>>(1);

  chart?: Chart = undefined

  constructor(private reportsService: ReportsService) {
    let startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    this.dataDateRange = new FormGroup({
      since: new FormControl(startDate),
      until: new FormControl(new Date())
    });

    this.dataDateRange.controls['until'].valueChanges.pipe(
      filter(it => it),
      map(it => ({since: this.dataDateRange.controls['since'].value, until: it})),
      startWith(this.dataDateRange.value),
      map(dates => {
        let endDate : Date = structuredClone(dates.until);
        endDate.setDate(endDate.getDate() + 1);
        return {since: dates.since as Date, until: endDate};
      })
    ).subscribe(dates => {
      this.state.next(PageState.LOADING);
      this.reportsService.getMeetingStats(dates).subscribe(stats => {
        this.meetingData.next(stats);
      })
    })

    this.meetingData.subscribe(_ => this.state.next(PageState.LOADED));

    this.meetingData.subscribe(stats => {
      const data = {
        labels: stats.map(it => it.meeting_date.toLocaleDateString(undefined, {dateStyle: 'short'})),
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
