import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncSubject, of } from 'rxjs';
import { Student } from 'src/app/models/student.model';
import { StudentsService } from 'src/app/services/students.service';

@Component({
  selector: 'app-show-student',
  templateUrl: './show-student.component.html',
  styleUrls: ['./show-student.component.scss']
})
export class ShowStudentComponent implements OnInit {
  protected student = new AsyncSubject<Student|null>()

  constructor(
    studentService: StudentsService,
    route: ActivatedRoute
  ) {
    let studentId = parseInt(route.snapshot.paramMap.get('studentId') ?? 'NaN' );
    if(studentId) {
      studentService.getStudent(studentId).subscribe(this.student);
    } else {
      of(null).subscribe(this.student);
    }
  }

  ngOnInit(): void {
  }

}
