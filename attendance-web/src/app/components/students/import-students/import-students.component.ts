import { Component, OnInit } from '@angular/core';
@Component({
  selector: 'app-import-students',
  templateUrl: './import-students.component.html',
  styleUrls: ['./import-students.component.scss']
})
export class ImportStudentsComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  onFileSelected(event: any) {
    console.log(event.target.files);

    const reader = new FileReader();
    reader.onload = (e: any) => {
      let data: string = e.target.result;
      if(data.startsWith("\xEF\xBB\xBF")) {
        data = data.substring(3);
      }
      console.log(data);
    };

    reader.readAsBinaryString(event.target.files![0]);
  }

}
