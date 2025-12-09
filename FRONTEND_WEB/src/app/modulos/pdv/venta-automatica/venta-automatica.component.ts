import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, firstValueFrom } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { ProductosAutoService } from 'src/app/services/productos/productos-auto.service';
import { TransaccionesService, generateUuidV4 } from 'src/app/services/ventas/transacciones.service';
import { EmpleadosService } from 'src/app/services/sistemas/control_comidas/empleados.service';
import { PrinterService } from 'src/app/services/printer/printer.service';


@Component({
  selector: 'app-venta-automatica',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './venta-automatica.component.html',
  styleUrls: ['./venta-automatica.component.css']
})
export class VentaAutomaticaComponent implements OnInit {
  // Productos / búsqueda
  productosAuto: any[] = [];
  productosFiltrados: any[] = [];
  loading = false;
  error: string | null = null;
  search$ = new Subject<string>();
  searchTerm = '';

  // Carrito
  cart: { producto: any; cantidad: number }[] = [];
  totalCart = 0;

  // Modal / pago
  showPagoModal = false;
  monederoCode = '';
  scanningMonedero = false;
  monederoError: string | null = null;

  // Empleado y preview
  empleadoSeleccionado: any = null;
  preview: any = null; // resultado de previewVenta

  // NIP / validación
  nip = '';
  nipError: string | null = null;
  validatingNip = false;
  processingCharge = false;

  constructor(
    private productosSvc: ProductosAutoService,
    private transSvc: TransaccionesService,
    private empleadosSvc: EmpleadosService,
    private printerService: PrinterService
  ) { }

  ngOnInit(): void {
    this.loadProductos();
    this.search$.pipe(debounceTime(200)).subscribe((t: string) => this.applyFilter(t));
  }

  // ---------- Productos ----------
  loadProductos(): void {
    this.loading = true;
    this.error = null;
    this.productosSvc.listAutoCharge().subscribe({
      next: (rows: any[]) => {
        this.productosAuto = (rows || []).map((p: any) => ({
          id: p.id,
          nombre: p.nombre ?? '',
          descripcion: p.descripcion ?? '',
          codigo_barras: p.codigo_barras ?? '',
          precio: Number(p.precio_venta ?? p.precio ?? 0),
          aplica_subsidio: !!p.aplica_subsidio,
          auto_charge: !!p.auto_charge,
          imagen_url: p.imagen_url ?? null
        }));
        this.productosFiltrados = [...this.productosAuto];
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error cargando productos', err);
        this.error = 'No se pudieron cargar los productos. Revisa la conexión.';
        this.loading = false;
      }
    });
  }

  // ---------- Buscador ----------
  onSearchInput(value: string) {
    this.searchTerm = value;
    this.search$.next(value || '');
  }

  applyFilter(term: string) {
    const q = (term || '').trim().toLowerCase();
    this.productosFiltrados = !q ? [...this.productosAuto] : this.productosAuto.filter((p: any) =>
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.descripcion || '').toLowerCase().includes(q) ||
      (p.codigo_barras || '').toLowerCase().includes(q)
    );
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter('');
  }

  // ---------- Carrito ----------
  selectProduct(product: any) {
    const existing = this.cart.find(c => c.producto.id === product.id);
    if (existing) existing.cantidad++;
    else this.cart.push({ producto: product, cantidad: 1 });
    this.recalcTotal();
    
    // Si ya hay un empleado seleccionado y modal abierto, refrescar preview
    if (this.empleadoSeleccionado && this.showPagoModal) {
      this.callPreviewForEmpleado();
    }
  }

  removeFromCart(index: number) {
    this.cart.splice(index, 1);
    this.recalcTotal();
    
    // Si ya hay un empleado seleccionado y modal abierto, refrescar preview
    if (this.empleadoSeleccionado && this.showPagoModal) {
      if (this.cart.length === 0) {
        // Si se vació el carrito, limpiar preview
        this.preview = null;
      } else {
        this.callPreviewForEmpleado();
      }
    }
  }

  setQuantity(index: number, qty: string | number) {
    const parsed = typeof qty === 'string' ? parseInt(qty as string, 10) : (qty as number);
    const safe = isNaN(parsed as number) ? 1 : Math.max(1, Math.floor(parsed as number));
    this.cart[index].cantidad = safe;
    this.recalcTotal();
    
    // Si ya hay un empleado seleccionado y modal abierto, refrescar preview
    if (this.empleadoSeleccionado && this.showPagoModal) {
      this.callPreviewForEmpleado();
    }
  }

  recalcTotal() {
    this.totalCart = this.cart.reduce((s, it) => s + (it.producto.precio * it.cantidad), 0);
  }

  // ---------- Modal pago ----------
  openPagoModal() {
    this.nip = '';
    this.nipError = null;
    this.monederoCode = '';
    this.empleadoSeleccionado = null;
    this.preview = null;
    this.monederoError = null;
    this.showPagoModal = true;
  }

  closePagoModal() {
    this.showPagoModal = false;
    this.nip = '';
    this.nipError = null;
    this.monederoCode = '';
    this.empleadoSeleccionado = null;
    this.preview = null;
    this.monederoError = null;
    this.validatingNip = false;
    this.processingCharge = false;
  }

  // lookup monedero and perform preview
  async lookupMonedero() {
    const code = (this.monederoCode || '').trim();
    if (!code) {
      this.monederoError = 'Ingresa o escanea el monedero';
      return;
    }

    this.monederoError = null;
    this.scanningMonedero = true;
    this.empleadoSeleccionado = null;
    this.preview = null;

    try {
      // Adaptar: si tienes GET /monedero/:code usa ese método; aquí uso buscarEmpleados como ejemplo
      const searchRes: any = await firstValueFrom(this.empleadosSvc.buscarEmpleados(code));
      let found: any = null;
      if (Array.isArray(searchRes)) {
        found = searchRes.length ? searchRes[0] : null;
      } else {
        found = searchRes;
      }

      if (!found) {
        this.monederoError = 'Monedero no encontrado';
        return;
      }

      // Normalize to empleado + monedero shape. Ajusta según tu API
      if (found.empleado || found.monedero) {
        this.empleadoSeleccionado = found;
      } else if (found.id && found.saldo != null) {
        this.empleadoSeleccionado = { empleado: { id: found.id, nombre: found.nombre ?? 'Empleado' }, monedero: { id: found.id, saldo: found.saldo } };
      } else {
        this.empleadoSeleccionado = { empleado: { id: found.id ?? 0, nombre: found.nombre ?? 'Empleado' }, monedero: { id: found.monedero_id ?? 0, saldo: found.saldo ?? 0 } };
      }

      console.log('👤 Empleado seleccionado completo:', this.empleadoSeleccionado);
      console.log('✅ ¿Empleado aplica subsidio?', this.empleadoSeleccionado?.empleado?.aplica_subsidio);

      // Immediately call preview with the current cart
      await this.callPreviewForEmpleado();
    } catch (err: any) {
      console.error('Error buscando monedero', err);
      this.monederoError = err?.error?.message ?? 'Error al buscar monedero';
    } finally {
      this.scanningMonedero = false;
    }
  }

  // call preview endpoint using current cart and empleadoSeleccionado
  async callPreviewForEmpleado() {
    if (!this.empleadoSeleccionado) return;
    const empleadoId = this.empleadoSeleccionado.empleado.id;
    const monederoId = this.empleadoSeleccionado.monedero?.id;

    const lineas = this.cart.map(c => {
      const linea = {
        producto_id: c.producto.id,  // ⚠️ Puede que tu backend espere "producto_id" en lugar de "product_id"
        cantidad: c.cantidad,
        precio_unitario: c.producto.precio,
        aplica_subsidio: !!c.producto.aplica_subsidio
      };
      console.log('🔍 Línea individual enviada:', linea);
      return linea;
    });

    const payload = { empleado_id: empleadoId, monedero_id: monederoId, lineas };
    console.log('🔍 Payload completo que se enviará:', JSON.stringify(payload, null, 2));
    try {
      console.log('📤 PREVIEW PAYLOAD (scanEmployee):', payload);
      const previewRes: any = await firstValueFrom(this.transSvc.previewVenta(payload));
      console.log('📥 PREVIEW RAW (scanEmployee) incoming:', previewRes);
      console.log('📊 Preview subsidio_estimado:', previewRes?.subsidio_estimado);
      console.log('📊 Preview total_bruto:', previewRes?.total_bruto);
      console.log('📊 Preview total_recomendado:', previewRes?.total_recomendado);
      console.log('📋 Preview detallesProcesados:', previewRes?.detallesProcesados);
      console.log('📋 Preview subsidio_por_producto:', previewRes?.subsidio_por_producto);
      
      // si previewRes es ok, úsalo tal cual
      this.preview = previewRes;
      if (previewRes?.saldo_monedero != null && this.empleadoSeleccionado?.monedero) {
        this.empleadoSeleccionado.monedero.saldo = previewRes.saldo_monedero;
      }
      this.preview._fallback = false;
      return previewRes;
    } catch (err: any) {
      console.warn('Preview falló, degradando a preview local sin subsidios:', err);
      // detectar error relacionado a subsidios o tabla inexistente (filtro amplio)
      const msg = err?.error?.message ?? err?.message ?? String(err);
      const subsidioProblem = /subsidio|subsidio_reglas|subsidios/i.test(msg);

      // construimos preview fallback local (sin subsidios)
      const total_bruto = this.cart.reduce((s, c) => s + (c.producto.precio * c.cantidad), 0);
      const subsidio_estimado = 0;
      const total_recomendado = total_bruto - subsidio_estimado;

      // saldo: preferimos el saldo que tenga empleadoSeleccionado.monedero, si el backend no lo devolvió
      const saldo_monedero = this.empleadoSeleccionado?.monedero?.saldo ?? 0;

      // preview fallback shape parecida a la real
      this.preview = {
        ok: !subsidioProblem,
        warning: subsidioProblem ? 'subsidio_rules_missing' : 'preview_error_client_fallback',
        empleado: this.empleadoSeleccionado?.empleado ?? null,
        saldo_monedero,
        total_bruto,
        subsidio_estimado,
        total_recomendado,
        detallesProcesados: this.cart.map(c => ({
          producto_id: c.producto.id,
          nombre: c.producto.nombre,
          cantidad: c.cantidad,
          precio_unitario: c.producto.precio,
          subsidio_aplicado: 0,
          total_linea: c.producto.precio * c.cantidad
        })),
        _fallback: true
      };

      // deja preview y permite continuar (mostrar NIP)
      this.monederoError = subsidioProblem ? 'Sistema de subsidios no configurado, procediendo sin subsidios' : null;
      return this.preview;
    }
  }

  // ---------- NIP validation + final transaction ----------
  async confirmarNipYRealizarCobro() {
    this.nipError = null;
    if (!this.empleadoSeleccionado) {
      this.nipError = 'Escanea o ingresa tu monedero primero';
      return;
    }
    if (!this.preview) {
      this.nipError = 'No se generó la vista previa de la venta';
      return;
    }
    if (!this.nip || this.nip.trim().length === 0) {
      this.nipError = 'Ingresa tu NIP';
      return;
    }

    this.validatingNip = true;
    try {
      const empleadoId = this.empleadoSeleccionado.empleado?.id;
      const monederoId = this.empleadoSeleccionado.monedero?.id;

      // 1) validar NIP -> obtener nip token
      const validarRes: any = await firstValueFrom(this.transSvc.validarNip(empleadoId, this.nip, monederoId));
      const nipToken = validarRes?.nip_token ?? validarRes?.nip_validation_token;
      if (!nipToken) {
        this.nipError = validarRes?.message ?? 'NIP inválido';
        this.validatingNip = false;
        return;
      }

      // 2) usuario_id: localStorage o extraer del JWT
      let currentUsuarioId = Number(localStorage.getItem('usuario_id')) || null;
      if (!currentUsuarioId) {
        currentUsuarioId = this.getUsuarioIdFromJwt() || null;
        if (currentUsuarioId) console.log('Usuario id detectado desde JWT:', currentUsuarioId);
      }

      // 3) saldo anterior para ticket (preferir preview.saldo_monedero si existe)
      const saldoAnterior = Number(this.preview?.saldo_monedero ?? this.empleadoSeleccionado?.monedero?.saldo ?? 0);

      // 4) Construir details usando preview (fuente de verdad)
      const preview = this.preview;
      const previewLines = Array.isArray(preview?.detallesProcesados)
        ? preview.detallesProcesados
        : (Array.isArray(preview?.subsidio_por_producto) ? preview.subsidio_por_producto : []);

      const details = this.cart.map((cartItem, idx) => {
        // Buscar por producto_id O por índice (fallback si producto_id es null en preview)
        let pl = previewLines.find((p: any) => Number(p.producto_id) === Number(cartItem.producto.id));
        if (!pl && previewLines[idx]) {
          pl = previewLines[idx]; // Fallback: usar mismo índice
        }
        
        const subsidio_unit = pl?.subsidio_aplicado_por_unidad != null ? Number(pl.subsidio_aplicado_por_unidad) : 0;
        const subsidio_total_line = pl?.subsidio_aplicado_total != null
          ? Number(pl.subsidio_aplicado_total)
          : (subsidio_unit * cartItem.cantidad);

        console.log(`📦 Producto ${cartItem.producto.id}: subsidio_unit=${subsidio_unit}, subsidio_total=${subsidio_total_line}`);

        return {
          producto_id: cartItem.producto.id,
          cantidad: cartItem.cantidad,
          precio_unitario: Number(cartItem.producto.precio ?? 0),
          aplica_subsidio: !!cartItem.producto.aplica_subsidio,
          subsidio_unitario: subsidio_unit,
          subsidio_aplicado: Number(subsidio_total_line.toFixed(2))
        };
      });

      // 5) total_venta: preferir preview.total_recomendado si existe
      const totalVenta = Number(preview?.total_recomendado ?? preview?.total_bruto ?? this.totalCart);

      // 6) punto de venta desde settings/localStorage
      const puntoVentaId = Number(localStorage.getItem('punto_venta_id')) || null;
      const puntoVentaCodigo = localStorage.getItem('punto_venta_codigo') || null;

      console.log('🏪 Punto de Venta desde localStorage:', {
        punto_venta_id: puntoVentaId,
        punto_venta_codigo: puntoVentaCodigo,
        raw_id: localStorage.getItem('punto_venta_id'),
        raw_codigo: localStorage.getItem('punto_venta_codigo')
      });

      // 7) Campos por defecto / fijos
      const impuestoId = 1;
      const METODO_PAGO_MONEDERO_ID = 4;

      // 8) Construcción de saleData
      const saleData: any = {
        empleado_id: empleadoId,
        usuario_id: currentUsuarioId,
        monedero_id: monederoId,
        metodo_pago_id: METODO_PAGO_MONEDERO_ID,
        impuesto_id: impuestoId,
        tipo_venta: 'AUTOCOBRO',
        total_venta: totalVenta,
        punto_venta_id: puntoVentaId,
        punto_venta_codigo: puntoVentaCodigo
      };

      console.log('✅ saleData construido con punto_venta:', {
        punto_venta_id: saleData.punto_venta_id,
        punto_venta_codigo: saleData.punto_venta_codigo
      });

      // 9) finalPayload y _meta de trazabilidad
      const finalPayload = {
        saleData,
        details,
        nip_validation_token: nipToken,
        _meta: {
          preview_timestamp: preview?.preview_meta?.timestamp ?? new Date().toISOString(),
          preview_rules_version: preview?.preview_meta?.rules_version ?? preview?.preview_meta?.rules ?? 'unknown'
        }
      };

      // 10) Logging y comprobación de campos mínimos
      console.group('%cVenta Automatica - Debug payload', 'color: #0b79d0; font-weight: 700;');
      console.log('%cObjeto que se enviará (finalPayload):', 'font-weight:700', finalPayload);
      console.log('%cSaleData (campos enviados):', 'font-weight:700', saleData);
      console.log('%cDetails (primeros 10):', 'font-weight:700', details.slice(0, 10));
      console.log('%cCampos esperados por backend (referencia):', 'font-weight:700; color: #444',
        ['saleData.empleado_id', 'saleData.usuario_id', 'saleData.monedero_id', 'saleData.metodo_pago_id', 'saleData.impuesto_id', 'saleData.tipo_venta', 'saleData.total_venta', 'saleData.punto_venta_id', 'saleData.punto_venta_codigo', 'details[].producto_id', 'details[].cantidad', 'details[].precio_unitario', 'details[].subsidio_aplicado', 'nip_validation_token']);

      const missing: string[] = [];
      if (!saleData.empleado_id) missing.push('saleData.empleado_id');
      if (!saleData.usuario_id) missing.push('saleData.usuario_id');
      if (!saleData.monedero_id) missing.push('saleData.monedero_id');
      if (!saleData.metodo_pago_id) missing.push('saleData.metodo_pago_id');
      if (!saleData.impuesto_id) missing.push('saleData.impuesto_id');
      if (!saleData.tipo_venta) missing.push('saleData.tipo_venta');
      if (!saleData.total_venta && saleData.total_venta !== 0) missing.push('saleData.total_venta');
      if (!details || details.length === 0) missing.push('details (vacío)');

      if (missing.length) {
        console.warn('%cCampos faltantes o nulos detectados:', 'color: #b35d00; font-weight:700', missing);
        this.nipError = 'Datos de venta incompletos (ver consola para detalles)';
        console.groupEnd();
        this.validatingNip = false;
        return;
      } else {
        console.log('%cTodos los campos mínimos presentes. Enviando al backend...', 'color: #0b7a0b; font-weight:700');
      }
      console.groupEnd();

      // 11) Envío y manejo de idempotencia
      const idempotencyKey = generateUuidV4();
      this.processingCharge = true;

      const res: any = await firstValueFrom(this.transSvc.crearTransaccion(finalPayload, idempotencyKey));
      const body = res?.body ?? res;
      console.log('Venta response:', body);

      if (body && (body.ok || body.success || body.venta_id)) {
        // 12) saldo final: preferir backend, fallback a cálculo (saldoAnterior - totalVenta)
        const saldoFinalFromBackend = (body.saldo_monedero != null) ? Number(body.saldo_monedero) : NaN;
        const montoCobrado = Number(body.total_venta ?? saleData.total_venta ?? totalVenta);
        const saldoFinalFallback = Number((saldoAnterior - montoCobrado).toFixed(2));
        const saldoFinal = Number.isFinite(saldoFinalFromBackend) ? saldoFinalFromBackend : saldoFinalFallback;

        if (saldoFinal != null && this.empleadoSeleccionado?.monedero) {
          this.empleadoSeleccionado.monedero.saldo = saldoFinal;
        }

        // 13) Preparar payload de impresión (se pasa body y saldos)
        const printedPayload = this.buildReceiptForPrint(body, saldoAnterior, saldoFinal);

        // 14) limpiar carrito y recalcular
        this.cart = [];
        this.recalcTotal();
        this.closePagoModal();

        // 15) Intentar imprimir (no bloquear el flujo si falla)
        try {
          const printerName = localStorage.getItem('imptk') || 'imptk';
          console.log('Intentando imprimir ticket en', printerName);
          await this.printerService.printReceipt(printerName, printedPayload);
          console.log('Impresión enviada correctamente');
        } catch (printErr) {
          console.error('Error enviando impresión, la venta se completó igual:', printErr);
          alert('Venta realizada, pero falló la impresión del ticket. Revisa la impresora.');
        }

        alert('Cobro realizado correctamente');
        return;
      } else {
        this.nipError = body?.message ?? 'Error al procesar la venta';
      }
    } catch (err: any) {
      console.error('Error en confirmarNipYRealizarCobro', err);
      const body = err?.error ?? err;
      if (body?.error === 'invalid_nip') this.nipError = body.message ?? 'NIP inválido';
      else if (body?.error === 'insufficient_balance') this.nipError = `Saldo insuficiente: disponible $${(this.empleadoSeleccionado?.monedero?.saldo ?? 0).toFixed(2)}`;
      else this.nipError = body?.message ?? 'Error en la transacción';
    } finally {
      this.validatingNip = false;
      this.processingCharge = false;
    }
  }

  // Helper: intenta extraer usuario_id del JWT guardado en localStorage (claim "id" en tu token)
  private getUsuarioIdFromJwt(): number | null {
    try {
      const token = localStorage.getItem('tokencontrolcomidas') || localStorage.getItem('token') || '';
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      // intenta distintos nombres de claims
      return Number(payload?.id ?? payload?.usuario_id ?? payload?.user_id ?? null) || null;
    } catch (e) {
      console.warn('No fue posible decodificar JWT para usuario_id', e);
      return null;
    }
  }

  // ---------- buildReceiptForPrint aceptando saldoAnterior ----------
  private buildReceiptForPrint(body: any, saldoAnterior: number, saldoFinal: number | null) {
    // preferir detalles que devuelva backend, si no, construir desde this.cart
    const backendDetails = Array.isArray(body.details) ? body.details : null;

    const items = backendDetails && backendDetails.length
      ? backendDetails.map((d: any) => ({
        nombre: d.nombre ?? d.producto_nombre ?? d.descripcion ?? `Producto ${d.producto_id ?? ''}`,
        descripcion: d.descripcion ?? null,
        cantidad: Number(d.cantidad ?? 0),
        precio_unitario: Number(d.precio_unitario ?? d.precio ?? 0),
        subsidio_aplicado: Number(d.subsidio_aplicado ?? d.subsidio_aplicado_total ?? 0)
      }))
      : this.cart.map((c: any) => ({
        nombre: c.producto?.nombre ?? `Producto ${c.producto?.id ?? ''}`,
        descripcion: c.producto?.descripcion ?? null,
        cantidad: Number(c.cantidad ?? 0),
        precio_unitario: Number(c.producto?.precio ?? 0),
        subsidio_aplicado: 0
      }));

    const totalBruto = Number(body.total_bruto ?? items.reduce((s: number, it: any) => s + (it.precio_unitario * it.cantidad), 0));
    const totalSubsidio = Number(body.subsidio_aplicado ?? body.total_subsidio ?? this.preview?.subsidio_estimado ?? items.reduce((s: number, it: any) => s + (it.subsidio_aplicado ?? 0), 0));
    const totalNeto = Number(body.total_venta ?? body.total_neto ?? (totalBruto - totalSubsidio));

    const ventaInfo = {
      fecha: new Date().toLocaleString(),
      referencia: body.referencia ?? null,
      venta_id: body.venta_id ?? null,
      empleado_nombre: this.empleadoSeleccionado?.empleado?.nombre ?? null,
      usuario_nombre: body.usuario_nombre ?? null,
      items,
      total_bruto: totalBruto,
      total_subsidio: totalSubsidio,
      total_neto: totalNeto,
      metodo_codigo: body.metodo_codigo ?? 'MONEDERO',
      metodo_nombre: body.metodo_nombre ?? 'Monedero',
      efectivo_entregado: body.efectivo_entregado ?? null,
      cambio: body.cambio ?? body.change ?? null
    };

    const monederoMeta = {
      saldo_anterior: Number(saldoAnterior ?? 0),
      saldo_final: (saldoFinal != null) ? Number(saldoFinal) : (body.saldo_monedero ?? body.new_saldo ?? this.preview?.saldo_monedero ?? null)
    };

    // devolver con tipo literal válido
    return { tipo: 'monedero' as const, venta: ventaInfo, monedero: monederoMeta };
  }
}