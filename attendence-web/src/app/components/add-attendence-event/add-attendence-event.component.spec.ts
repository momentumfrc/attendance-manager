import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddAttendenceEventComponent } from './add-attendence-event.component';

describe('AddAttendenceEventComponent', () => {
  let component: AddAttendenceEventComponent;
  let fixture: ComponentFixture<AddAttendenceEventComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddAttendenceEventComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddAttendenceEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
