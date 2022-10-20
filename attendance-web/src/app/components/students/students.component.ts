import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-students',
  templateUrl: './students.component.html',
  styleUrls: ['./students.component.scss']
})
export class StudentsComponent implements OnInit {
  readonly tabs = [
    {
      path: './list',
      name: 'List Students',
    }, {
      path: './add',
      name: 'Add Student'
    }, {
      path: './import',
      name: 'Import Students'
    }
  ]

  constructor() {
  }

  ngOnInit(): void {
  }

}
