import { Component, OnInit } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';

import { Student, StudentsService } from 'src/app/services/students.service';

@Component({
  selector: 'app-students-list',
  templateUrl: './students-list.component.html',
  styleUrls: ['./students-list.component.scss']
})
export class StudentsListComponent implements OnInit {
  students: Observable<Array<Student>> = EMPTY

  constructor(private studentService : StudentsService) {
  }

  ngOnInit(): void {
    this.students = this.studentService.getAllStudents()
  }

}
