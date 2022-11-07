import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators, AsyncValidatorFn, FormGroupDirective } from '@angular/forms';
import { ActivatedRoute, Router, UrlSegment } from '@angular/router';
import { PendingUpdate, PendingUpdateType, StudentsService } from 'src/app/services/students.service';
import { Student } from 'src/app/models/student.model';
import { AsyncSubject, BehaviorSubject, combineLatest, forkJoin, map, Observable, of, ReplaySubject, Subscription, take, tap } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

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

  private studentsSub!: Subscription

  constructor(
    private studentsService : StudentsService,
    private snackBar: MatSnackBar,
    private router: Router,
    route: ActivatedRoute) {
      let id = route.snapshot.paramMap.get('studentId');
      this.students = this.studentsService.getAllStudents();
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
    }

  ngOnInit(): void {
    if(this.state.getValue() != ComponentState.NO_STUDENT_PROVIDED) {
      this.editStudent.subscribe((student) => {
        if(student != null) {
          this.mainForm.controls.name.setValue(student.name);
        }
      })
    }
  }

  ngOnDestroy(): void {
  }

  private nameTakenValidator : AsyncValidatorFn = (control) => {
    const name = (control.value ?? "").toLocaleLowerCase();
    let editStudent: Observable<Student|null> = this.editStudent;
    return forkJoin([
      this.students.pipe(take(1)),
      editStudent.pipe(take(1))
    ]).pipe(
      map((values: [Array<Student>, Student|null]) => {
        const students = values[0];
        const editStudent = values[1];
        let invalid = students.some(student => student.name.toLocaleLowerCase() == name);
        if(editStudent != null) {
          invalid = invalid && editStudent.name.toLocaleLowerCase() != name;
        }
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

  onSubmit(formData: any, formDirective: FormGroupDirective): void {
    this.mainForm.disable();
    const studentName = this.mainForm.value.name!;
    if(this.state.getValue() != ComponentState.NO_STUDENT_PROVIDED) {
      // edit existing user
      this.editStudent.subscribe(student => {
        if(student == null) {
          return;
        }
        this.studentsService.updateStudent({id: student.id, name: studentName}).subscribe(
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
      this.studentsService.registerNewStudent(studentName).subscribe((student: Student) => {
        this.studentsService.refreshStudents();
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
    let pendingDelete = new PendingUpdate(student, PendingUpdateType.DELETE,
      (update) => {
        return this.studentsService.deleteStudent(student.id).pipe(map(it => void 0));
      }
    );

    const updateId = this.studentsService.addPendingUpdate(pendingDelete);

    const snackBarRef = this.snackBar.open("Student " + student.name + " deleted!", 'Undo', {
      duration: 4000
    });

    const deletionExecutor = snackBarRef.afterDismissed().subscribe(() => {
      this.studentsService.commitPendingUpdate(updateId);
    });

    snackBarRef.onAction().subscribe(() => {
      this.studentsService.clearPendingUpdate(updateId);
    });

    this.router.navigate(['/', 'students']);
  }

}
