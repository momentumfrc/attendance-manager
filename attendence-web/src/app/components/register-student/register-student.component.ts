import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StudentsService } from 'src/app/services/students.service';
import { Student } from 'src/app/models/student.model';

@Component({
  selector: 'app-register-student',
  templateUrl: './register-student.component.html',
  styleUrls: ['./register-student.component.scss']
})
export class RegisterStudentComponent implements OnInit {

  constructor(private studentsService : StudentsService, private router: Router) { }

  ngOnInit(): void {
  }

  mainForm = new FormGroup({
    name: new FormControl('', [Validators.required])
  });

  onSubmit(): void {
    this.mainForm.disable();
    this.studentsService.registerNewStudent(this.mainForm.value.name!).subscribe((student: Student) => {
      this.router.navigate(['/students']);
    })
  }

}
