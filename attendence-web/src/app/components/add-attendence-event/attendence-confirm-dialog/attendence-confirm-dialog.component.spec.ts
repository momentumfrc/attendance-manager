import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendenceConfirmDialogComponent } from './attendence-confirm-dialog.component';

describe('AttendenceConfirmDialogComponent', () => {
  let component: AttendenceConfirmDialogComponent;
  let fixture: ComponentFixture<AttendenceConfirmDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AttendenceConfirmDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendenceConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
