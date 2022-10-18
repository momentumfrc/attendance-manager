import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, map, startWith, Subject } from 'rxjs';
import { Student } from 'src/app/models/student.model';
import { StudentsService } from 'src/app/services/students.service';
import { SearchBoxComponent } from '../../reuse/search-box/search-box.component';

@Component({
  selector: 'app-list-students',
  templateUrl: './list-students.component.html',
  styleUrls: ['./list-students.component.scss']
})
export class ListStudentsComponent implements AfterViewInit {
  allStudents = new BehaviorSubject<Array<Student>>([])

  filteredStudents = new Subject<Array<Student>>
  @ViewChild(SearchBoxComponent) searchBox!: SearchBoxComponent

  constructor(
    private studentsService : StudentsService,
  ) { }

  ngAfterViewInit(): void {
     // Get students from database
    this.studentsService.getAllStudents().subscribe((students) => this.allStudents.next(students));

    // Combine search, sort filters, and student roster into the final observable which
    // will be formatted and shown to the user
    combineLatest([
      this.allStudents,
      (this.searchBox.searchUpdatedEvent).pipe(startWith(""))
    ]).pipe(map((values : [Array<Student>, string]) => {
      let students = (values[0] as Array<Student>);
      let search = values[1].toLocaleLowerCase();

      let value = students;

      // implement search
      if(search != "") {
        value = value.filter(student => student.name.toLocaleLowerCase().includes(search));
      }

      return value;
      })).subscribe(this.filteredStudents)
  }

  refreshStudents(): void {
    this.studentsService.getAllStudents().subscribe((students) => this.allStudents.next(students));
  }
}
