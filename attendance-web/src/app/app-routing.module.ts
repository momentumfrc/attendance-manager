import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { AddAttendanceEventListComponent } from './components/add-attendance-event-list/add-attendance-event-list.component';
import { ElevateUsersComponent } from './components/elevate-users/elevate-users.component';
import { ErrorComponent } from './components/error/error.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { MeetingEventsComponent } from './components/meeting-events/meeting-events.component';
import { CsvExportComponent } from './components/reports/csv-export/csv-export.component';
import { EventLogComponent } from './components/reports/event-log/event-log.component';
import { MeetingAttendanceReportComponent } from './components/reports/meeting-attendance-report/meeting-attendance-report.component';
import { MeetingsReportComponent } from './components/reports/meetings-report/meetings-report.component';
import { ReportsComponent } from './components/reports/reports.component';
import { StudentStatsComponent } from './components/reports/student-stats/student-stats.component';
import { ImportStudentsComponent } from './components/students/import-students/import-students.component';
import { ListStudentsComponent } from './components/students/list-students/list-students.component';
import { ShowStudentComponent } from './components/students/show-student/show-student.component';
import { StudentsComponent } from './components/students/students.component';
import { UpdateOrCreateStudentComponent } from './components/students/update-or-create-student/update-or-create-student.component';
import { MustBeLoggedInGuard } from './guards/must-be-logged-in.guard';
import { MustHavePermissionGuard } from './guards/must-have-role.guard';
import { MustNotBeLoggedInGuard } from './guards/must-not-be-logged-in.guard';

const routes: Routes = [
  { path: 'students', component: StudentsComponent,
    canActivate: [MustBeLoggedInGuard, MustHavePermissionGuard],
    data: { permissions: ['list students', 'view student images']},
    children: [
      {path: '', redirectTo: 'list', pathMatch: 'full'},
      {path: 'detail/:studentId', component: ShowStudentComponent},
      { path: 'edit/:studentId', component: UpdateOrCreateStudentComponent,
        canActivate: [MustHavePermissionGuard],
        data: { permissions: ['modify students', 'modify student images'] }},
      {path: 'list', component: ListStudentsComponent},
      {path: 'add', component: UpdateOrCreateStudentComponent,
        canActivate: [MustHavePermissionGuard],
        data: { permissions: ['add students', 'modify student images'] }},
      {path: 'import', component: ImportStudentsComponent,
        canActivate: [MustHavePermissionGuard],
        data: { permissions: ['add students', 'modify student images'] }
      }
    ]
  },
  { path: 'reports', component: ReportsComponent,
    canActivate: [MustBeLoggedInGuard, MustHavePermissionGuard],
    data: { permissions: ['list students', 'view stats'] },
    children: [
      { path: '', redirectTo: 'meetings', pathMatch: 'full' },
      { path: 'meetings', component: MeetingsReportComponent },
      { path: 'meetings/attendance', component: MeetingAttendanceReportComponent },
      { path: 'meetings/attendance/:date', component: MeetingAttendanceReportComponent },
      { path: 'student-stats', component: StudentStatsComponent },
      { path: 'event-log', component: EventLogComponent },
      { path: 'export', component: CsvExportComponent }
    ]
  },
  { path: 'meetings', component: MeetingEventsComponent,
    canActivate: [MustBeLoggedInGuard, MustHavePermissionGuard],
    data: { permissions: ['list meeting events', 'add meeting events']}
  },
  { path: 'users', component: ElevateUsersComponent, canActivate: [MustBeLoggedInGuard, MustHavePermissionGuard],
    data: { permissions: ['list users'] }},
  { path: 'login', component: LoginComponent, canActivate: [MustNotBeLoggedInGuard] },
  { path: '', component: HomeComponent,
    canActivate: [MustBeLoggedInGuard],
    children: [
      { path: 'check-in', component: AddAttendanceEventListComponent,
        canActivate: [MustHavePermissionGuard], data: { permissions: [ 'list attendance events' ]}},
      { path: 'check-out', component: AddAttendanceEventListComponent,
        canActivate: [MustHavePermissionGuard], data: { permissions: [ 'list attendance events' ]}}
    ]
  },
  { path: 'error', component: ErrorComponent },
  { path: '**', redirectTo: '/'}
];

const routerOptions: ExtraOptions = {
  //enableTracing: environment.production == false
};

@NgModule({
  imports: [RouterModule.forRoot(routes, routerOptions)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
