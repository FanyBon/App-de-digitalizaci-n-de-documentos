import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfiguracionImpresoraComponent } from './configuracion-impresora.component';

describe('ConfiguracionImpresoraComponent', () => {
  let component: ConfiguracionImpresoraComponent;
  let fixture: ComponentFixture<ConfiguracionImpresoraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfiguracionImpresoraComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfiguracionImpresoraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
