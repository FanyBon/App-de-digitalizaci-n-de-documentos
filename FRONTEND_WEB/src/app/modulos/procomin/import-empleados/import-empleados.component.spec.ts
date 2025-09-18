import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportEmpleadosComponent } from './import-empleados.component';

describe('ImportEmpleadosComponent', () => {
  let component: ImportEmpleadosComponent;
  let fixture: ComponentFixture<ImportEmpleadosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportEmpleadosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportEmpleadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
