import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddAttendenceEventComponent } from './components/add-attendence-event/add-attendence-event.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterStudentComponent } from './components/register-student/register-student.component';
import { StudentsListComponent } from './components/students-list/students-list.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'students', component: StudentsListComponent, canActivate: [AuthGuard],
    children: [
      { path: 'register', component: RegisterStudentComponent }
    ]},
  { path: 'login', component: LoginComponent },
  { path: '', component: AddAttendenceEventComponent, canActivate: [AuthGuard]},
  { path: '**', redirectTo: '/'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
