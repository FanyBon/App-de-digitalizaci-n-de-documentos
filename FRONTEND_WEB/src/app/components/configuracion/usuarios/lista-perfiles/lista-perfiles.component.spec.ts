import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaPerfilesComponent } from './lista-perfiles.component';

describe('ListaPerfilesComponent', () => {
  let component: ListaPerfilesComponent;
  let fixture: ComponentFixture<ListaPerfilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaPerfilesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaPerfilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
