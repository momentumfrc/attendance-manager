import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddAttendenceEventComponent } from './components/add-attendence-event/add-attendence-event.component';
import { ElevateUsersComponent } from './components/elevate-users/elevate-users.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterStudentComponent } from './components/register-student/register-student.component';
import { StudentsListComponent } from './components/students-list/students-list.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

const routes: Routes = [
  { path: 'students', component: StudentsListComponent, canActivate: [AuthGuard],
  children: [
    { path: 'register', component: RegisterStudentComponent }
  ]},
  { path: 'attendence', component: AddAttendenceEventComponent,
    canActivate: [AuthGuard, RoleGuard], data: { allowedRoles: ['mentor', 'admin'] }},
  { path: 'admin', component: ElevateUsersComponent, canActivate: [AuthGuard, RoleGuard],
    data: { allowedRoles: ['admin'] }},
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/students', pathMatch: 'full'},
  { path: '**', redirectTo: '/'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
