import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ElevateUsersComponent } from './components/elevate-users/elevate-users.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterStudentComponent } from './components/manage-students/register-student/register-student.component';
import { MustBeLoggedInGuard } from './guards/must-be-logged-in.guard';
import { MustNotBeLoggedInGuard } from './guards/must-not-be-logged-in.guard';
import { MustHaveRoleGuard } from './guards/must-have-role.guard';
import { ManageStudentsComponent } from './components/manage-students/manage-students.component';
import { ListStudentsComponent } from './components/manage-students/list-students/list-students.component';
import { ImportStudentsComponent } from './components/manage-students/import-students/import-students.component';

const routes: Routes = [
  { path: 'students', component: ManageStudentsComponent,
    canActivate: [MustBeLoggedInGuard, MustHaveRoleGuard],
    data: { roleOptions: ['mentor', 'admin']},
    children: [
      {path: '', redirectTo: 'list', pathMatch: 'full'},
      {path: 'list', component: ListStudentsComponent},
      {path: 'add', component: RegisterStudentComponent},
      {path: 'import', component: ImportStudentsComponent}
    ]
  },
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
