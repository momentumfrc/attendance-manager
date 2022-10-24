import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { Papa } from 'ngx-papaparse';
import { BehaviorSubject, combineLatest, forkJoin, map, ReplaySubject, startWith, Subject, switchMap, take, throwError } from 'rxjs';
import { StudentsService } from 'src/app/services/students.service';

type Validator = (info: NewStudentInfo) => boolean;

class ValidatedInfo {
  public constructor(
    public readonly info: NewStudentInfo,
    public readonly valid: boolean
  ) {}
}

class NewStudentInfo {
  constructor(
    public readonly name: string
  ) {}

  validate(validators: Array<Validator>): ValidatedInfo {
    let isValid = validators.reduce(
      (isValidSoFar, currentValidator) => isValidSoFar && currentValidator(this),
      true
    );
    return new ValidatedInfo(this, isValid);
  }
};



@Component({
  selector: 'app-import-students',
  templateUrl: './import-students.component.html',
  styleUrls: ['./import-students.component.scss']
})
export class ImportStudentsComponent implements OnInit {

  protected uploadedData = new Subject<string|Blob>();
  protected parsedData = new ReplaySubject<Array<NewStudentInfo>>(1);
  protected parseError = new BehaviorSubject<string|null>(null);
  protected validatedData = new ReplaySubject<Array<ValidatedInfo>>(1);

  protected uploading = new BehaviorSubject<boolean>(false);

  constructor(
    private papa: Papa,
    private studentsService: StudentsService,
    private snackBar: MatSnackBar,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.uploadedData.subscribe(data => {
      const parsed = this.papa.parse(data, {
        header: true
      });
      if(parsed.meta.aborted) {
        console.log(parsed.errors);
        this.parseError.next('CSV Parse error: ' + parsed.errors[0].message);
        this.parsedData.next([]);
        return;
      }
      if(!parsed.meta.fields.includes('Name')) {
        this.parseError.next('Invalid CSV Format: missing "Name" field');
        this.parsedData.next([]);
        return;
      }

      let cleaned: Array<NewStudentInfo> = parsed.data
        .filter((it: any) => (it.Name as string).length > 0)
        .map((it: any) => new NewStudentInfo(it.Name));

      if(cleaned.length == 0) {
        this.parseError.next('No data provided in input file');
        this.parsedData.next([]);
        return;
      }
      this.parseError.next(null);
      this.parsedData.next(cleaned);
    })

    combineLatest({
      'data': this.parsedData,
      'students': this.studentsService.getAllStudents()
    }).pipe(map(({data, students}) => {
      const studentNames = new Set(students.map(it => it.name));

      const validateNamesAreUnique: Validator = info => !studentNames.has(info.name);

      return data.map(it => it.validate([validateNamesAreUnique]));
    })).subscribe(this.validatedData);
  }

  isAnyInfoValid(data: Array<ValidatedInfo>): boolean {
    return data.filter(it => it.valid).length > 0;
  }

  onFileSelected(event: any) {
    this.studentsService.refreshStudents();
    const reader = new FileReader();
    reader.onload = (e: any) => {
      let data: string = e.target.result;

      // Remove BOM (which is sometimes added by Excel)
      if(data.startsWith("\xEF\xBB\xBF")) {
        data = data.substring(3);
      }

      this.uploadedData.next(data);
    };

    reader.readAsBinaryString(event.target.files![0]);
  }

  submit() {
    this.uploading.next(true);
    this.validatedData.pipe(
      take(1),
      map(items => items.filter(it => it.valid)),
      switchMap(items => forkJoin(items.map(it => this.studentsService.registerNewStudent(it.info.name))))
      ).subscribe( (students) => {
        this.snackBar.open('Registered ' + students.length + ' new students', '', {
          duration: 4000
        });
        this.studentsService.refreshStudents();
        this.router.navigate(['/', 'students', 'list'])
      });
  }
}
