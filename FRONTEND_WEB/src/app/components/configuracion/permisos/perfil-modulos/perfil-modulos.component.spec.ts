import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilModulosComponent } from './perfil-modulos.component';

describe('PerfilModulosComponent', () => {
  let component: PerfilModulosComponent;
  let fixture: ComponentFixture<PerfilModulosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilModulosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PerfilModulosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
