import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonederosService, SaldoResponse } from '../../services/recargas/monederos.service';
import { Html5Qrcode } from 'html5-qrcode';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-consulta-saldo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consulta-saldo.component.html',
  styleUrls: ['./consulta-saldo.component.css']
})
export class ConsultaSaldoComponent implements OnDestroy {

  /* -------------------- Modelo -------------------- */
  codigo      = '';
  saldo       = 0;
  empleadoId: number | null = null;
  errorMsg    = '';

  /* -------------------- UI State ------------------ */
  showModal   = false;
  showQrModal = false;

  /* -------------------- Runtime ------------------- */
  qrScanner: Html5Qrcode | null = null;
  private sub?: Subscription;

  constructor(
    private monService: MonederosService,
    private cd: ChangeDetectorRef
  ) {}

  /* ------------ Consulta por código texto -------- */
  consultarPorCodigo(): void {
    this.resetModal();
    const code = this.codigo.trim();

    if (!code) {
      this.errorMsg = 'Ingresa un código válido';
      this.showModal = true;
      return;
    }

    this.sub = this.monService.consultaSaldoCodigo(code)
      .subscribe({
        next: res => this.onSuccess(res),
        error: err => this.onError(err)
      });
  }

  /* ------------- Consulta capturada por QR -------- */
  private consultarPorQr(text: string): void {
    this.resetModal();

    this.sub = this.monService.consultaSaldoQR(text)
      .subscribe({
        next: res => this.onSuccess(res),
        error: err => this.onError(err)
      });
  }

  /* ---------------- Abrir escáner ----------------- */
  openQrScanner(): void {
    this.resetModal();
    this.showQrModal = true;

    // fuerza renderizado del div#qr-reader
    this.cd.detectChanges();

    setTimeout(() => this.initQr(), 0);
  }

  /* --------- Inicializa la librería QR ------------ */
  private initQr(): void {
    const regionId = 'qr-reader';
    const container = document.getElementById(regionId);

    if (!container) {
      console.error(`Elemento con id="${regionId}" no encontrado`);
      this.showQrModal = false;
      return;
    }

    this.qrScanner = new Html5Qrcode(regionId);

    this.qrScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      decodedText => {
        this.closeQrScanner();
        this.consultarPorQr(decodedText);
      },
      /* onDecodeError */ () => {}
    )
    .catch(err => {
      console.error('No se pudo iniciar el escáner QR', err);
      this.showQrModal = false;
    });
  }

  /* ----------- Detiene y libera cámara ------------ */
  async closeQrScanner(): Promise<void> {
    if (this.qrScanner) {
      try {
        await this.qrScanner.stop();
        await this.qrScanner.clear();
      } catch (err) {
        console.warn('Error liberando cámara:', err);
      }
      this.qrScanner = null;
    }
    this.showQrModal = false;
  }

  /* -------------------- Callbacks ----------------- */
  private onSuccess(res: SaldoResponse): void {
    console.log('[Consulta exitosa]', res);
    this.empleadoId = res.empleado_id;
    this.saldo      = parseFloat(res.saldo_actual);
    this.showModal  = true;
  }

  private onError(err: any): void {
    console.error('[Error en consulta]', err);
    this.errorMsg   = err.error?.error ?? 'No se pudo consultar el saldo';
    this.showModal  = true;
  }

  /* ------------------- Utilidades ----------------- */
  closeModal(): void {
    this.showModal = false;
    this.codigo    = '';
    this.errorMsg  = '';
  }

  private resetModal(): void {
    this.showModal  = false;
    this.errorMsg   = '';
    this.saldo      = 0;
    this.empleadoId = null;
  }

  ngOnDestroy(): void {
    if (this.qrScanner) {
      this.qrScanner.stop().then(() => this.qrScanner?.clear()).catch(() => {});
    }
    this.sub?.unsubscribe();
  }
}