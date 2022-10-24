import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncSubject, catchError, filter, map, Observable, of, partition, share, switchMap, tap, throwError } from 'rxjs';
import { Student } from 'src/app/models/student.model';
import { User } from 'src/app/models/user.model';
import { StudentsService } from 'src/app/services/students.service';
import { UsersService } from 'src/app/services/users.service';

@Component({
  selector: 'app-show-student',
  templateUrl: './show-student.component.html',
  styleUrls: ['./show-student.component.scss']
})
export class ShowStudentComponent implements OnInit {
  protected student = new AsyncSubject<Student>()
  protected invalidStudent = new AsyncSubject<boolean>()
  protected registeredBy = new AsyncSubject<User>()

  constructor(
    studentService: StudentsService,
    route: ActivatedRoute,
    private usersService: UsersService
  ) {
    const studentId = parseInt(route.snapshot.paramMap.get('studentId') ?? 'NaN' );
    let studentRequest: Observable<Student|null>;
    if(studentId) {
      studentRequest = studentService.getStudent(studentId).pipe(
        catchError((error: HttpErrorResponse) => {
          if(error.status == 404) {
            return of(null);
          }
          return throwError(() => error);
        })
      );
    } else {
      studentRequest = of(null);
    }

    const [student, invalidStudent] = partition(studentRequest.pipe(share()), it => it != null);
    (student as Observable<Student>).subscribe(this.student);
    (invalidStudent as Observable<null>).pipe( map(it => it == null) ).subscribe(this.invalidStudent);
  }

  ngOnInit(): void {
    this.student.pipe(
      switchMap(it => this.usersService.getUser((it as Student).registered_by))
    ).subscribe(this.registeredBy);
  }

}
