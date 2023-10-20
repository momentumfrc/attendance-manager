import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, AsyncValidatorFn, FormGroupDirective } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentsService } from 'src/app/services/students.service';
import { Student } from 'src/app/models/student.model';
import { BehaviorSubject, forkJoin, map, Observable, ReplaySubject, Subscription, take, filter } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DateTime } from 'luxon';
import { ErrorStateMatcher } from '@angular/material/core';

enum ComponentState {
  NO_STUDENT_PROVIDED,
  LOADING_STUDENT,
  NO_STUDENT_FOUND,
  LOADED
}

@Component({
  selector: 'app-update-or-create-student',
  templateUrl: './update-or-create-student.component.html',
  styleUrls: ['./update-or-create-student.component.scss']
})
export class UpdateOrCreateStudentComponent implements OnInit, OnDestroy {
  protected readonly stateType = ComponentState
  protected state: BehaviorSubject<ComponentState>
  private students : Observable<Array<Student>>

  editStudent = new ReplaySubject<Student|null>(1)
  isDeleted: Observable<Boolean>

  private studentsSub!: Subscription

  mainForm: FormGroup

  constructor(
    private studentsService : StudentsService,
    private snackBar: MatSnackBar,
    private router: Router,
    route: ActivatedRoute) {
      let id = route.snapshot.paramMap.get('studentId');
      this.students = this.studentsService.getAllStudents(true);
      if(route.snapshot.url[0].path == 'edit' && id != null) {
        let parsedId = parseInt(id);
        this.students.pipe(take(1), map( (students: Array<Student>) => {
          return students.find(it => it.id == parsedId) ?? null;
        })).subscribe(this.editStudent);

        this.state = new BehaviorSubject<ComponentState>(ComponentState.LOADING_STUDENT);
        this.editStudent.pipe(map(student => {
          if(student != null) {
            return ComponentState.LOADED;
          } else {
            return ComponentState.NO_STUDENT_FOUND;
          }
        })).subscribe((state) => this.state.next(state));
      } else {
        this.state = new BehaviorSubject<ComponentState>(ComponentState.NO_STUDENT_PROVIDED);
        this.editStudent.next(null);
      }

      this.mainForm = new FormGroup({
        name: new FormControl('', {
          validators: [Validators.required]
        }),
        graduation_year: new FormControl('', {
          validators: [Validators.pattern('\\d+')]
        })
      }, {
        asyncValidators: [this.nameTakenValidator]
      });

      this.isDeleted = this.editStudent.pipe(
        filter(student => student != null),
        map(student => student?.deleted_at != null)
      );

      this.isDeleted.subscribe(isDeleted => {
        if(isDeleted) {
          this.mainForm.disable();
        } else {
          this.mainForm.enable();
        }
      });

    }

  ngOnInit(): void {
    if(this.state.getValue() != ComponentState.NO_STUDENT_PROVIDED) {
      this.editStudent.subscribe((student) => {
        if(student != null) {
          this.mainForm.controls['name'].setValue(student.name);
          if(student.graduation_year) {
            this.mainForm.controls['graduation_year'].setValue(student.graduation_year);
          }
        }
      })
    }
  }

  ngOnDestroy(): void {
  }

  private nameTakenValidator : AsyncValidatorFn = (control) => {
    const group = control as FormGroup;
    const name: string = (group.controls['name'].value ?? '').toLocaleLowerCase();
    const yearStr: string|undefined = group.controls['graduation_year'].value;

    let year: number|undefined;
    if(yearStr) {
      year = parseInt(yearStr);
    } else {
      year = undefined;
    }

    return forkJoin({
      students: this.students.pipe(take(1)),
      editStudent: this.editStudent.pipe(take(1))
    }).pipe(
      map(({students, editStudent}) => {
        let conflicts = students.filter(student => student.name.toLocaleLowerCase() == name && student.graduation_year == year);
        if(editStudent != null) {
          conflicts = conflicts.filter(student => student.id != editStudent.id);
        }
        if(conflicts.length > 0) {
          return { nameTaken: { name, year } };
        } else {
          return null;
        }
    }));
  }

  onSubmit(formData: any, formDirective: FormGroupDirective): void {
    this.mainForm.disable();
    const studentName = this.mainForm.value.name!;
    let graduation_year: number|undefined = parseInt(this.mainForm.value.graduation_year);
    if(isNaN(graduation_year)) {
      graduation_year = undefined;
    }

    if(this.state.getValue() != ComponentState.NO_STUDENT_PROVIDED) {
      // edit existing user
      this.editStudent.subscribe(student => {
        if(student == null) {
          return;
        }
        this.studentsService.updateStudent(student.id, {name: studentName, graduation_year}).subscribe(
          (student: Student) => {
            this.snackBar.open("Student " + student.name + " updated!", '', {
              duration: 4000
            });
            this.router.navigate(['/', 'students', 'detail', student.id]);
          }
        );
      });
    } else {
      // create new user
      this.studentsService.registerNewStudent({
        name: studentName,
        graduation_year
      }).subscribe((student: Student) => {
        this.studentsService.invalidateCache();
        this.mainForm.enable();
        this.mainForm.reset();
        formDirective.resetForm();
        this.snackBar.open("Student " + studentName + " registered!", '', {
          duration: 4000
        });
      })
    }
  }

  doDelete(student: Student) {
    this.studentsService.deleteStudent(student.id).subscribe();

    const snackBarRef = this.snackBar.open("Student " + student.name + " deleted!", 'Undo', {
      duration: 4000
    });

    snackBarRef.onAction().subscribe(() => {
      this.studentsService.undoDeleteStudent(student.id).subscribe();
    });

    this.router.navigate(['/', 'students']);
  }

  undoDelete(student: Student) {
    this.studentsService.undoDeleteStudent(student.id).subscribe();

    const snackBarRef = this.snackBar.open("Student " + student.name + " restored!", 'Undo', {
      duration: 4000
    });

    snackBarRef.onAction().subscribe(() => {
      this.studentsService.deleteStudent(student.id).subscribe()
    });

    this.router.navigate(['/', 'students', 'detail', student.id]);
  }

  protected getGradYearPlaceholder(): string {
    return DateTime.now().plus({'years': 4}).year.toString();
  }

  protected matcher: ErrorStateMatcher = {
    isErrorState(control, form): boolean {
      if(!control || !form) {
        return false;
      }
      return (control.invalid || (form.errors?.['nameTaken'])) && control.dirty;
    },
  }
}
