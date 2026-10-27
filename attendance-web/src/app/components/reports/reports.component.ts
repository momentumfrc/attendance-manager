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
      path: './student-stats',
      name: 'Student Stats'
    },
    {
      path: './student-roster',
      name: 'Student Roster'
    },
    {
      path: './event-log',
      name: 'Event Log'
    }
  ]
  constructor() { }

  ngOnInit(): void {
  }

}
