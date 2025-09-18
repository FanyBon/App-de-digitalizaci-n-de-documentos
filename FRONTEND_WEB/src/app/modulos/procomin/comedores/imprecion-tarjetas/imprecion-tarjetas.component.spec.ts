import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImprecionTarjetasComponent } from './imprecion-tarjetas.component';

describe('ImprecionTarjetasComponent', () => {
  let component: ImprecionTarjetasComponent;
  let fixture: ComponentFixture<ImprecionTarjetasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImprecionTarjetasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImprecionTarjetasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
