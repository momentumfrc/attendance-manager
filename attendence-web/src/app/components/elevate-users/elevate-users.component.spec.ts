import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElevateUsersComponent } from './elevate-users.component';

describe('ElevateUsersComponent', () => {
  let component: ElevateUsersComponent;
  let fixture: ComponentFixture<ElevateUsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ElevateUsersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElevateUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
