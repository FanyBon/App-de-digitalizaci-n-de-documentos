import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlComidasComponent } from './control-comidas.component';

describe('ControlComidasComponent', () => {
  let component: ControlComidasComponent;
  let fixture: ComponentFixture<ControlComidasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlComidasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControlComidasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
