import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RolPermisosComponent } from './rol-permisos.component';

describe('RolPermisosComponent', () => {
  let component: RolPermisosComponent;
  let fixture: ComponentFixture<RolPermisosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolPermisosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RolPermisosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
