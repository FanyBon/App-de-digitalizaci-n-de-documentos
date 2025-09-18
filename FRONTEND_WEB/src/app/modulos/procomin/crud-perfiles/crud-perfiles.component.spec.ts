import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrudPerfilesComponent } from './crud-perfiles.component';

describe('CrudPerfilesComponent', () => {
  let component: CrudPerfilesComponent;
  let fixture: ComponentFixture<CrudPerfilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrudPerfilesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrudPerfilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
