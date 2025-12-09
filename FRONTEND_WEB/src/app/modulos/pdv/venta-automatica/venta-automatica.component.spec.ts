import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VentaAutomaticaComponent } from './venta-automatica.component';

describe('VentaAutomaticaComponent', () => {
  let component: VentaAutomaticaComponent;
  let fixture: ComponentFixture<VentaAutomaticaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VentaAutomaticaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VentaAutomaticaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
