import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeleccionPdvComponent } from './seleccion-pdv.component';

describe('SeleccionPdvComponent', () => {
  let component: SeleccionPdvComponent;
  let fixture: ComponentFixture<SeleccionPdvComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeleccionPdvComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeleccionPdvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
