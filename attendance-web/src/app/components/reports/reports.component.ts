import { Component, computed } from '@angular/core';
import { isActive, Router } from '@angular/router';

@Component({
    selector: 'app-reports',
    templateUrl: './reports.component.html',
    styleUrls: ['./reports.component.scss'],
    standalone: false
})
export class ReportsComponent {
  readonly tabs = [
    {
      path: '/reports/meetings',
      name: 'Meetings'
    },
    {
      path: '/reports/student-stats',
      name: 'Student Stats'
    },
    {
      path: '/reports/student-roster',
      name: 'Student Roster'
    },
    {
      path: '/reports/attendance-sessions',
      name: 'Attendance Sessions'
    },
    {
      path: '/reports/event-log',
      name: 'Event Log'
    }
  ].map(tab => ({...tab, active: isActive(tab.path, this.router)}));

  readonly selectedTab = computed(() => this.tabs.find(tab => tab.active()));

  constructor(protected router: Router) { }
}
