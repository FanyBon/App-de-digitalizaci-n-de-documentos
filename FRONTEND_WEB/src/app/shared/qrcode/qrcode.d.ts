import { Directive, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import QRCode from 'qrcode';

@Directive({
  selector: '[appQRCode]',
  standalone: true
})
export class QRCodeDirective implements OnChanges {
  // El valor que se codificará en el QR
  @Input('appQRCode') value: string = '';

  // Opciones opcionales: ancho y margen del QR
  @Input() qrWidth: number = 128;
  @Input() qrMargin: number = 4;

  constructor(private el: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.generateQRCode();
  }

  private generateQRCode(): void {
    if (this.value) {
      QRCode.toCanvas(
        this.el.nativeElement,
        this.value,
        { width: this.qrWidth, margin: this.qrMargin },
        (error) => {
          if (error) {
            console.error('Error al generar el QR Code', error);
          }
        }
      );
    }
  }
}
