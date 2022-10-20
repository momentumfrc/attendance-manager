import { NgModule } from '@angular/core';
import { RouterModule, Routes, UrlSegment } from '@angular/router';
import { ElevateUsersComponent } from './components/elevate-users/elevate-users.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { UpdateOrCreateStudentComponent } from './components/students/update-or-create-student/update-or-create-student.component';
import { MustBeLoggedInGuard } from './guards/must-be-logged-in.guard';
import { MustNotBeLoggedInGuard } from './guards/must-not-be-logged-in.guard';
import { MustHaveRoleGuard } from './guards/must-have-role.guard';
import { StudentsComponent } from './components/students/students.component';
import { ListStudentsComponent } from './components/students/list-students/list-students.component';
import { ImportStudentsComponent } from './components/students/import-students/import-students.component';
import { ShowStudentComponent } from './components/students/show-student/show-student.component';

const routes: Routes = [
  { path: 'students', component: StudentsComponent,
    canActivate: [MustBeLoggedInGuard, MustHaveRoleGuard],
    data: { roleOptions: ['mentor', 'admin']},
    children: [
      {path: '', redirectTo: 'list', pathMatch: 'full'},
      {path: 'detail/:studentId', component: ShowStudentComponent},
      {path: 'edit/:studentId', component: UpdateOrCreateStudentComponent},
      {path: 'list', component: ListStudentsComponent},
      {path: 'add', component: UpdateOrCreateStudentComponent},
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
