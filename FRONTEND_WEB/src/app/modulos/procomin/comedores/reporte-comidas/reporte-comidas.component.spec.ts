import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReporteComidasComponent } from './reporte-comidas.component';

describe('ReporteComidasComponent', () => {
  let component: ReporteComidasComponent;
  let fixture: ComponentFixture<ReporteComidasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteComidasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReporteComidasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
