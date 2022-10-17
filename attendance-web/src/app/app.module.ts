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

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RegisterStudentComponent } from './components/manage-students/register-student/register-student.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AddAttendanceEventComponent } from './components/add-attendance-event/add-attendance-event.component';

import { httpInterceptorProviders } from './http-interceptors';
import { LoginComponent } from './components/login/login.component';
import { ElevateUsersComponent } from './components/elevate-users/elevate-users.component';
import { UserComponent } from './components/elevate-users/user/user.component';
import { HomeComponent } from './components/home/home.component';
import { AttendanceConfirmDialogComponent } from './components/add-attendance-event/attendance-confirm-dialog/attendance-confirm-dialog.component';
import { ManageStudentsComponent } from './components/manage-students/manage-students.component';
import { ListStudentsComponent } from './components/manage-students/list-students/list-students.component';
import { ImportStudentsComponent } from './components/manage-students/import-students/import-students.component';


@NgModule({
  declarations: [
    AppComponent,
    RegisterStudentComponent,
    AddAttendanceEventComponent,
    LoginComponent,
    ElevateUsersComponent,
    UserComponent,
    HomeComponent,
    AttendanceConfirmDialogComponent,
    ManageStudentsComponent,
    ListStudentsComponent,
    ImportStudentsComponent
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
    MatTabsModule
  ],
  providers: [
    httpInterceptorProviders
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
