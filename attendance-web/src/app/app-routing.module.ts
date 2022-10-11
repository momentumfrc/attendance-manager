import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddAttendanceEventComponent } from './components/add-attendance-event/add-attendance-event.component';
import { ElevateUsersComponent } from './components/elevate-users/elevate-users.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterStudentComponent } from './components/register-student/register-student.component';
import { MustBeLoggedInGuard } from './guards/must-be-logged-in.guard';
import { MustNotBeLoggedInGuard } from './guards/must-not-be-logged-in.guard';
import { MustHaveRoleGuard } from './guards/must-have-role.guard';

const routes: Routes = [
  { path: 'register-student', component: RegisterStudentComponent,
    canActivate: [MustBeLoggedInGuard, MustHaveRoleGuard], data: { roleOptions: ['mentor', 'admin']}},
  { path: 'admin', component: ElevateUsersComponent, canActivate: [MustBeLoggedInGuard, MustHaveRoleGuard],
    data: { roleOptions: ['mentor', 'admin'] }},
  { path: 'login', component: LoginComponent, canActivate: [MustNotBeLoggedInGuard] },
  { path: '', component: HomeComponent, canActivate: [MustBeLoggedInGuard] },
  { path: '**', redirectTo: '/'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
