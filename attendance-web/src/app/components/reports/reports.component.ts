import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-reports',
    templateUrl: './reports.component.html',
    styleUrls: ['./reports.component.scss'],
    standalone: false
})
export class ReportsComponent implements OnInit {
  tabs = [
    {
      path: './meetings',
      name: 'Meetings'
    },
    {
      path: './event-log',
      name: 'Event Log'
    },
    {
      path: './export',
      name: 'Export CSV',
    }
  ]
  constructor() { }

  ngOnInit(): void {
  }

}
