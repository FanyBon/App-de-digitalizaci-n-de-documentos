import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeleccionUbicacionComponent } from './seleccion-ubicacion.component';

describe('SeleccionUbicacionComponent', () => {
  let component: SeleccionUbicacionComponent;
  let fixture: ComponentFixture<SeleccionUbicacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeleccionUbicacionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeleccionUbicacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
