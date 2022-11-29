import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  tabs = [
    {
      path: './export',
      name: 'Export CSV',
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
