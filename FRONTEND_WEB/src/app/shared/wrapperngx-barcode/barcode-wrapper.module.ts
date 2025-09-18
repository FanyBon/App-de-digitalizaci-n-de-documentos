import { Directive, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import JsBarcode from 'jsbarcode';

@Directive({
  selector: '[appBarcode]',
  standalone: true
})
export class BarcodeDirective implements OnChanges {
  @Input('appBarcode') value: string = '';
  // Opciones opcionales para formato, ancho y alto
  @Input() bcFormat: string = 'CODE128';
  @Input() bcWidth: number = 2;
  @Input() bcHeight: number = 50;
  @Input() bcDisplayValue: boolean = true;

  constructor(private el: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.generateBarcode();
  }

  private generateBarcode(): void {
    if (this.value) {
      JsBarcode(this.el.nativeElement, this.value, {
        format: this.bcFormat,
        width: this.bcWidth,
        height: this.bcHeight,
        displayValue: this.bcDisplayValue
      });
    }
  }
}
