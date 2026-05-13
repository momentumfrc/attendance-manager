import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatLuxonDateModule } from '@angular/material-luxon-adapter';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AddAttendanceEventListComponent } from './components/add-attendance-event-list/add-attendance-event-list.component';

import { MatSelectModule } from '@angular/material/select';
import { SpinnerComponent } from 'src/app/components/reuse/spinner/spinner.component';
import { CropImageComponent } from './components/crop-image/crop-image.component';
import { ElevateUsersComponent } from './components/elevate-users/elevate-users.component';
import { UserComponent } from './components/elevate-users/user/user.component';
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
import { ConfirmDialogComponent } from './components/reuse/confirm-dialog/confirm-dialog.component';
import { DatePickerComponent } from './components/reuse/date-picker/date-picker.component';
import { SearchBoxComponent } from './components/reuse/search-box/search-box.component';
import { ImportStudentsComponent } from './components/students/import-students/import-students.component';
import { ListStudentsComponent } from './components/students/list-students/list-students.component';
import { ShowStudentComponent } from './components/students/show-student/show-student.component';
import { StudentsComponent } from './components/students/students.component';
import { UpdateOrCreateStudentComponent } from './components/students/update-or-create-student/update-or-create-student.component';
import { httpInterceptorProviders } from './http-interceptors';


@NgModule({ declarations: [
        AppComponent,
        UpdateOrCreateStudentComponent,
        AddAttendanceEventListComponent,
        CropImageComponent,
        DatePickerComponent,
        LoginComponent,
        ElevateUsersComponent,
        UserComponent,
        HomeComponent,
        StudentsComponent,
        ListStudentsComponent,
        ImportStudentsComponent,
        SearchBoxComponent,
        ShowStudentComponent,
        StudentStatsComponent,
        ReportsComponent,
        CsvExportComponent,
        EventLogComponent,
        MeetingEventsComponent,
        ConfirmDialogComponent,
        MeetingsReportComponent,
        MeetingAttendanceReportComponent,
        ErrorComponent
    ],
    bootstrap: [AppComponent], imports: [
        SpinnerComponent,
        BrowserModule,
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
        MatSelectModule,
        MatTooltipModule,
        MatDatepickerModule,
        MatLuxonDateModule,
        MatTableModule,
        MatPaginatorModule,
        MatSidenavModule,
        MatSlideToggleModule], providers: [
        httpInterceptorProviders,
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule { }
