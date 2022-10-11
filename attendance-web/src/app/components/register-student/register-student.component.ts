import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, AsyncValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { StudentsService } from 'src/app/services/students.service';
import { Student } from 'src/app/models/student.model';
import { AsyncSubject, map, Observable, of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-register-student',
  templateUrl: './register-student.component.html',
  styleUrls: ['./register-student.component.scss']
})
export class RegisterStudentComponent implements OnInit {

  private students = new AsyncSubject<Array<Student>>();

  constructor(private studentsService : StudentsService, private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.studentsService.getAllStudents().subscribe(this.students);
  }

  private nameTakenValidator : AsyncValidatorFn = (control) => {
    const name = (control.value ?? "").toLocaleLowerCase();
    return this.students.pipe(map(students => {
      const invalid = students.some(student => student.name.toLocaleLowerCase() == name);
      if(invalid) {
        return { nameTaken: { value: control.value } };
      } else {
        return null;
      }
    }));
  }

  mainForm = new FormGroup({
    name: new FormControl('', {
      validators: [Validators.required],
      asyncValidators: [this.nameTakenValidator]
    })
  });

  onSubmit(): void {
    this.mainForm.disable();
    const studentName = this.mainForm.value.name!;
    this.studentsService.registerNewStudent(studentName).subscribe((student: Student) => {
      this.mainForm.controls.name.reset();
      this.mainForm.enable();
      this.snackBar.open("Student " + studentName + " registered!", '', {
        duration: 4000
      });
    })
  }

}