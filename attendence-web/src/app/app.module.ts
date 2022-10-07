import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatButtonModule } from '@angular/material/button';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { StudentsListComponent } from './components/students-list/students-list.component';
import { RegisterStudentComponent } from './components/register-student/register-student.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AddAttendenceEventComponent } from './components/add-attendence-event/add-attendence-event.component';

import { httpInterceptorProviders } from './http-interceptors';


@NgModule({
  declarations: [
    AppComponent,
    StudentsListComponent,
    RegisterStudentComponent,
    AddAttendenceEventComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatButtonModule
  ],
  providers: [
    httpInterceptorProviders
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
