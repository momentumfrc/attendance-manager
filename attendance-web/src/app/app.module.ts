import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AddAttendanceEventListComponent } from './components/add-attendance-event-list/add-attendance-event-list.component';

import { httpInterceptorProviders } from './http-interceptors';
import { LoginComponent } from './components/login/login.component';
import { ElevateUsersComponent } from './components/elevate-users/elevate-users.component';
import { UserComponent } from './components/elevate-users/user/user.component';
import { HomeComponent } from './components/home/home.component';
import { StudentsComponent } from './components/students/students.component';
import { ListStudentsComponent } from './components/students/list-students/list-students.component';
import { ImportStudentsComponent } from './components/students/import-students/import-students.component';
import { SearchBoxComponent } from './components/reuse/search-box/search-box.component';
import { ShowStudentComponent } from './components/students/show-student/show-student.component';
import { UpdateOrCreateStudentComponent } from './components/students/update-or-create-student/update-or-create-student.component';
import { SpinnerComponent } from './components/reuse/spinner/spinner.component';
import { ReportsComponent } from './components/reports/reports.component';
import { CsvExportComponent } from './components/reports/csv-export/csv-export.component';
import { EventLogComponent } from './components/reports/event-log/event-log.component';
import { MeetingEventsComponent } from './components/meeting-events/meeting-events.component';
import { MeetingConfirmDialogComponent } from './components/meeting-events/meeting-confirm-dialog/meeting-confirm-dialog.component';


@NgModule({
  declarations: [
    AppComponent,
    UpdateOrCreateStudentComponent,
    AddAttendanceEventListComponent,
    LoginComponent,
    ElevateUsersComponent,
    UserComponent,
    HomeComponent,
    StudentsComponent,
    ListStudentsComponent,
    ImportStudentsComponent,
    SearchBoxComponent,
    ShowStudentComponent,
    SpinnerComponent,
    ReportsComponent,
    CsvExportComponent,
    EventLogComponent,
    MeetingEventsComponent,
    MeetingConfirmDialogComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatToolbarModule,
    MatIconModule,
    MatMenuModule,
    MatListModule,
    MatDividerModule,
    MatDialogModule,
    MatButtonToggleModule,
    MatInputModule,
    MatCardModule,
    MatSnackBarModule,
    MatRadioModule,
    MatTabsModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule
  ],
  providers: [
    httpInterceptorProviders
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
