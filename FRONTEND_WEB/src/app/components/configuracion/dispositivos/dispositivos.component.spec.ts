import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DispositivosComponent } from './dispositivos.component';

describe('DispositivosComponent', () => {
  let component: DispositivosComponent;
  let fixture: ComponentFixture<DispositivosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DispositivosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DispositivosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
