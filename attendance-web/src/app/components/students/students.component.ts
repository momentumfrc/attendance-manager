import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-students',
  templateUrl: './students.component.html',
  styleUrls: ['./students.component.scss']
})
export class StudentsComponent implements OnInit {
  tabs = [
    {
      path: './list',
      name: 'List Students',
    }, {
      path: './add',
      name: 'Add Student'
    }
  ]

  constructor() {
    // FIXME: This should always be the same value as the $mobile-width scss variable. It would be
    //        best if we somehow imported the scss variable instead of hardcoding the magic number.
    if(window.innerWidth > 600) {
      this.tabs.push( {
        path: './import',
        name: 'Import Students'
      })
    }
  }

  ngOnInit(): void {
  }

}
