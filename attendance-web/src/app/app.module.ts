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

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AddAttendanceEventComponent } from './components/add-attendance-event/add-attendance-event.component';

import { httpInterceptorProviders } from './http-interceptors';
import { LoginComponent } from './components/login/login.component';
import { ElevateUsersComponent } from './components/elevate-users/elevate-users.component';
import { UserComponent } from './components/elevate-users/user/user.component';
import { HomeComponent } from './components/home/home.component';
import { AttendanceConfirmDialogComponent } from './components/add-attendance-event/attendance-confirm-dialog/attendance-confirm-dialog.component';
import { StudentsComponent } from './components/students/students.component';
import { ListStudentsComponent } from './components/students/list-students/list-students.component';
import { ImportStudentsComponent } from './components/students/import-students/import-students.component';
import { SearchBoxComponent } from './components/reuse/search-box/search-box.component';
import { ShowStudentComponent } from './components/students/show-student/show-student.component';
import { UpdateOrCreateStudentComponent } from './components/students/update-or-create-student/update-or-create-student.component';
import { SpinnerComponent } from './components/reuse/spinner/spinner.component';


@NgModule({
  declarations: [
    AppComponent,
    UpdateOrCreateStudentComponent,
    AddAttendanceEventComponent,
    LoginComponent,
    ElevateUsersComponent,
    UserComponent,
    HomeComponent,
    AttendanceConfirmDialogComponent,
    StudentsComponent,
    ListStudentsComponent,
    ImportStudentsComponent,
    SearchBoxComponent,
    ShowStudentComponent,
    SpinnerComponent
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
    MatProgressSpinnerModule
  ],
  providers: [
    httpInterceptorProviders
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
