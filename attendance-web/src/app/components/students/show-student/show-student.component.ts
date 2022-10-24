import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncSubject, filter, of, switchMap } from 'rxjs';
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
  protected student = new AsyncSubject<Student|null>()
  protected registeredBy = new AsyncSubject<User>()

  constructor(
    studentService: StudentsService,
    route: ActivatedRoute,
    private usersService: UsersService
  ) {
    let studentId = parseInt(route.snapshot.paramMap.get('studentId') ?? 'NaN' );
    if(studentId) {
      studentService.getStudent(studentId).subscribe(this.student);
    } else {
      of(null).subscribe(this.student);
    }
  }

  ngOnInit(): void {
    this.student.pipe(
      filter(it => it != null),
      switchMap(it => this.usersService.getUser(it!!.registered_by))
    ).subscribe(this.registeredBy);
  }

}
