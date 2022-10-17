import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-manage-students',
  templateUrl: './manage-students.component.html',
  styleUrls: ['./manage-students.component.scss']
})
export class ManageStudentsComponent implements OnInit {
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
