import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddAttendenceEventComponent } from './components/add-attendence-event/add-attendence-event.component';
import { RegisterStudentComponent } from './components/register-student/register-student.component';
import { StudentsListComponent } from './components/students-list/students-list.component';

const routes: Routes = [
  { path: 'students', component: StudentsListComponent },
  { path: 'students/register', component: RegisterStudentComponent },
  { path: 'attendence', component: AddAttendenceEventComponent },
  { path: '', redirectTo: '/attendence', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
