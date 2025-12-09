import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsignarUbicacionesComponent } from './asignar-ubicaciones.component';

describe('AsignarUbicacionesComponent', () => {
  let component: AsignarUbicacionesComponent;
  let fixture: ComponentFixture<AsignarUbicacionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsignarUbicacionesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsignarUbicacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
