import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { switchMap, map, catchError, tap } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { ProductosService, Producto } from '../../../services/productos/productos.service';
import { FamiliaProductoService, FamiliaProducto } from '../../../services/productos/familias-productos.service';
import { EmpleadosService } from '../../../services/sistemas/control_comidas/empleados.service';
import { MonederosService } from 'src/app/services/recargas/monederos.service';
import { TransaccionesService } from '../../../services/ventas/transacciones.service';
import { SubsidiosService } from '../../../services/ventas/subsidios.service';
import { MetodosPagoService } from '../../../services/recargas/metodos-pago.service';
import { PrinterService } from 'src/app/services/printer/printer.service';
import { ChangeDetectorRef } from '@angular/core';

//Interfaces para la identificación del producto
interface CartItem extends Producto {
  cantidad: number;
}
//Interfaces para la identificación del empleado y su monedero
interface Monedero {
  id: number;
  saldo: number;
}
// Interfaces para la identificación del empleado 
interface Empleado {
  id: number;
  nombre: string;
  codigo_barras: string;
  monedero_id: number;
  monedero?: Monedero;
}

@Component({
  selector: 'app-venta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './venta.component.html',
  styleUrls: ['./venta.component.css']
})

export class VentaComponent implements OnInit {
  searchTerm: string = ''; //Variables de búsqueda y productos
  products: Producto[] = []; //Productos tomados desde el backend
  cart: CartItem[] = []; //Carrito de la venta
  showSaleTypeModal: boolean = false; //Estados para controlar los modales
  showScanModal: boolean = false;
  showTransactionSummaryModal: boolean = false;
  isVentaMonedero: boolean = false;
  scanCode: string = ''; //Variable para el código escaneado
  empleado: Empleado | null = null; //Datos del empleado (resultado de la búsqueda)
  //Variables para el resumen de la transacción
  transactionTotal: number = 0;  // Suma total de productos sin descuento
  subsidioTotal: number = 0;     // Total del subsidio aplicado
  netTotal: number = 0;          // Total a pagar luego del subsidio
  familias: FamiliaProducto[] = []; // Lista de familias (categorías)
  selectedFamily: number | null = null; // Almacena la familia seleccionada (null = sin filtro, es decir, "Todos")
  //Propiedades para la venta normal con método de pago
  showPaymentMethodModal: boolean = false;
  metodosPago: any[] = [];
  selectedMetodoPago: any = null;
  montoRecibido: number = 0; // Solo para pago en efectivo
  // estado
  nip = '';
  validandoNip = false;
  nipValidationToken: string | null = null;
  nipValidatedAt = 0;
  NIP_TTL_MS = 10 * 60 * 1000; // 10 minutos, ajustar si backend indica otro TTL
  idempotencyKey: string | null = null;
  creating = false;
  createAttempts = 0;
  MAX_CREATE_RETRIES = 3;
  errorNipMsg = '';
  errorGeneral = '';
  preview: any = null;
  infoMsg: string = '';

  // Helpers seguros y cálculo de subsidio
  private parseNumber(v: any, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  private calcularDescuento(subsidio: any, precioUnitario: number, cantidad: number): number {
    // Soporta subsidio por porcentaje o monto fijo por unidad
    if (!subsidio) return 0;
    const tipo = (subsidio.tipo ?? '').toString().toLowerCase();
    if (tipo === 'porcentaje' || subsidio.porcentaje != null) {
      const porcentaje = parseFloat(String(subsidio.porcentaje ?? '0')) / 100;
      return +(precioUnitario * cantidad * porcentaje).toFixed(2);
    }
    if (tipo === 'fijo' || subsidio.monto_fijo != null) {
      const montoFijo = parseFloat(String(subsidio.monto_fijo ?? '0'));
      return +(montoFijo * cantidad).toFixed(2);
    }
    return 0;
  }

  // Inyectamos los diferetes servicio que vamos a usar
  constructor(
    private productosService: ProductosService,
    private familiaService: FamiliaProductoService,
    private empleadoService: EmpleadosService,
    private monederosService: MonederosService,
    private transaccionesService: TransaccionesService,
    private subsidiosService: SubsidiosService,
    private metodosPagoService: MetodosPagoService,
    private printerService: PrinterService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.obtenerProductos();
    this.obtenerFamilias();
  }

  // Obtiene productos desde el backend
  obtenerProductos(): void {
    this.productosService.getProductos().subscribe({
      next: (productos: Producto[]) => {
        this.products = productos;
      },
      error: (err) => {
        console.error('Error al obtener productos:', err);
      }
    });
  }

  /** Obtiene las familias (categorías) desde el backend */
  obtenerFamilias(): void {
    this.familiaService.getFamiliasProductos().subscribe({
      next: (familias: FamiliaProducto[]) => {
        this.familias = familias;
      },
      error: (err) => {
        console.error('Error al obtener familias:', err);
      }
    });
  }

  /** Filtra los productos según la búsqueda y la familia seleccionada */
  filteredProducts(): Producto[] {
    let filtered = this.products.filter(product =>
      product.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    if (this.selectedFamily !== null) {
      filtered = filtered.filter(product => product.familia_id === this.selectedFamily);
    }
    return filtered;
  }

  /** Selecciona una familia para filtrar los productos */
  selectFamily(familyId: number | null): void {
    this.selectedFamily = familyId;
  }

  // Agregar un producto al carrito
  addToCart(product: Producto): void {
    // Si el producto ya existe en el carrito, aumentar la cantidad, de lo contrario agregarlo con cantidad 1
    const itemIndex = this.cart.findIndex(item => item.id === product.id);
    if (itemIndex !== -1) {
      this.cart[itemIndex].cantidad++;
    } else {
      this.cart.push({
        ...product,
        cantidad: 1
      });
    }
    // Vuelve a recalcular los totales
    this.calculateTransaction();
  }
  // Aumenta la cantidad del producto en el carrito
  increaseQuantity(item: CartItem): void {
    item.cantidad++;
    this.calculateTransaction();
  }

  // Disminuye la cantidad del producto, si llega a 1 y se reduce, lo elimina
  decreaseQuantity(item: CartItem): void {
    if (item.cantidad > 1) {
      item.cantidad--;
      this.calculateTransaction();
    } else {
      // Si la cantidad es 1 y se disminuye, se elimina el producto
      this.removeFromCart(item);
    }
  }

  // Elimina un item del carrito
  removeFromCart(item: CartItem): void {
    this.cart = this.cart.filter(i => i.id !== item.id);
    this.calculateTransaction();
  }

  /** Calcula el total usando el campo 'precio_venta' */
  get total(): number {
    return this.cart.reduce((sum, item) => sum + (item.precio_venta * item.cantidad), 0);
  }

  /** Abre el modal de selección de tipo de venta */
  openSaleTypeModal(): void {
    this.showSaleTypeModal = true;
  }

  /** Cierra todos los modales */
  closeModals(): void {
    this.showSaleTypeModal = false;
    this.showScanModal = false;
    this.showTransactionSummaryModal = false;
    this.showPaymentMethodModal = false;
    this.selectedMetodoPago = null;
  }

  // Retorna los items para mostrar en el modal, prefiriendo preview.detallesProcesados pero usando nombres desde this.cart
  public getPreviewItemsForDisplay(): Array<any> {
    const previewItems = Array.isArray(this.preview?.detallesProcesados) ? this.preview.detallesProcesados
      : (Array.isArray(this.preview?.subsidio_por_producto) ? this.preview.subsidio_por_producto : []);

    if (!Array.isArray(previewItems) || previewItems.length === 0) {
      return (Array.isArray(this.cart) ? this.cart.map((it: any) => ({
        producto_id: Number(it.id),
        nombre: it.nombre ?? `Producto ${it.id}`,
        cantidad: Number(it.cantidad || 0),
        precio_unit: Number(it.precio_venta || 0),
        aplica_subsidio: !!it.subsidio_id,
        subsidio_aplicado_por_unidad: Number((it as any).subsidio_por_unidad ?? 0),
        subsidio_aplicado_total: Number((it as any).subsidio_aplicado ?? 0),
        motivo_no_subsidio: (it as any).motivo_no_subsidio ?? null
      })) : []);
    }

    return previewItems.map((p: any) => {
      const prodId = Number(p.producto_id);
      const cartMatch = Array.isArray(this.cart) ? this.cart.find((c: any) => Number(c.id) === prodId) : null;
      return {
        producto_id: prodId,
        nombre: cartMatch?.nombre ?? cartMatch?.descripcion ?? `Producto ${prodId}`,
        cantidad: Number(p.cantidad ?? 0),
        precio_unit: Number(p.precio_unit ?? p.precio_unitario ?? 0),
        aplica_subsidio: !!p.aplica_subsidio,
        subsidio_aplicado_por_unidad: Number(p.subsidio_aplicado_por_unidad ?? p.subsidio_por_unidad ?? 0),
        subsidio_aplicado_total: Number(p.subsidio_aplicado_total ?? p.subsidio_aplicado ?? 0),
        motivo_no_subsidio: p.motivo_no_subsidio ?? null
      };
    });
  }


  // Detección robusta de si hay subsidio en preview
  hasSubsidioPreview(): boolean {
    if (!this.preview) return false;
    const est = Number(this.preview.subsidio_estimado ?? 0);
    if (est > 0) return true;
    const arr = Array.isArray(this.preview.subsidio_por_producto) ? this.preview.subsidio_por_producto : this.preview.detallesProcesados;
    return Array.isArray(arr) && arr.some((p: any) => Number(p.subsidio_aplicado_total ?? 0) > 0 || Number(p.subsidio_aplicado_por_unidad ?? 0) > 0);
  }





  chooseVentaPorMonedero(): void {
    console.log('chooseVentaPorMonedero invoked');
    this.showPaymentMethodModal = false;
    this.isVentaMonedero = true;
    this.showScanModal = true;
    this.showSaleTypeModal = false;
    this.selectedMetodoPago = null;

    console.log("Flujo de Ventas por Monedero iniciado");
    // Consulta y asigna dinámicamente el método de pago MONEDERO (por ejemplo, con código "monedero")
    this.metodosPagoService.listarMetodosPago().subscribe({
      next: (metodos: any[]) => {
        const metodoMonedero = metodos.find(m => m.codigo?.toLowerCase() === 'monedero');
        if (metodoMonedero) {
          this.selectedMetodoPago = metodoMonedero;
          console.log("Método de pago asignado automáticamente:", this.selectedMetodoPago);
        } else {
          console.warn("No se encontró el método de pago MONEDERO.");
        }
      },
      error: (err) => console.error("Error al obtener métodos de pago:", err)
    });
  }


  // --- scanEmployee() actualizado ---
  scanEmployee(): void {
    if (!this.scanCode) return;

    this.empleadoService.buscarEmpleados(this.scanCode).pipe(
      switchMap((empleados: any[]) => {
        if (!Array.isArray(empleados) || empleados.length === 0) {
          throw new Error('Empleado no encontrado');
        }
        const empleadoEncontrado = empleados[0];
        return this.monederosService.obtenerMonederoPorEmpleado(empleadoEncontrado.monedero_id).pipe(
          map((monedero: any) => {
            empleadoEncontrado.monedero = {
              id: monedero?.id ?? null,
              saldo: monedero && monedero.saldo_actual != null ? parseFloat(monedero.saldo_actual) : 0
            };
            return empleadoEncontrado;
          })
        );
      }),
      switchMap((empleadoConMonedero: any) => {
        this.empleado = empleadoConMonedero;

        const lineasPreview = (typeof this.buildDetailsForBackend === 'function')
          ? this.buildDetailsForBackend()
          : (Array.isArray(this.cart) ? this.cart.map((it: any) => ({
            producto_id: Number(it.id),
            cantidad: Number(it.cantidad || 1),
            precio_unitario: Number(this.parseNumber(it.precio_venta || 0).toFixed(2)),
            aplica_subsidio: !!it.subsidio_id
          })) : []);

        // incluir empleado_id explícitamente (clave que falta)
        const payloadPreview = {
          empleado_id: Number(this.empleado?.id ?? 0),
          monedero_id: Number(this.empleado?.monedero?.id ?? 0),
          lineas: lineasPreview
        };

        console.log('PREVIEW PAYLOAD (scanEmployee):', payloadPreview);

        if (typeof this.transaccionesService.previewVenta === 'function') {
          return this.transaccionesService.previewVenta(payloadPreview).pipe(
            tap((resp: any) => console.log('previewVenta RESPONSE RAW:', resp)),
            map((resp: any) => {
              // Soporta HttpResponse con body o respuesta directa
              const preview = resp && resp.body ? resp.body : resp;
              console.log('PREVIEW RAW (scanEmployee) incoming:', preview);
              this.preview = preview;
              return this.empleado;
            }),
            catchError(err => {
              console.error('Error previewVenta:', err);
              this.preview = null;
              return of(this.empleado);
            })
          );
        }

        this.preview = null;
        return of(this.empleado);
      })
    ).subscribe({
      next: (empleado: any) => {
        this.empleado = empleado;

        // recalcula totals usando preview (o fallback local)
        this.calculateTransaction();

        // logs antes de abrir modal (temporal)
        console.log('PREVIEW AT OPEN:', this.preview);
        console.log('preview.total_bruto / subsidio_estimado / total_recomendado:', this.preview?.total_bruto, this.preview?.subsidio_estimado, this.preview?.total_recomendado);
        console.log('preview.detallesProcesados:', this.preview?.detallesProcesados ?? this.preview?.subsidio_por_producto);
        console.log('cart ids:', (this.cart || []).map((c: any) => ({ id: c.id, type: typeof c.id, nombre: c.nombre })));
        console.log('previewItemsForDisplay():', this.getPreviewItemsForDisplay());
        console.log('hasSubsidioPreview():', this.hasSubsidioPreview());

        // forzar detección antes de abrir modal
        try { this.cd.detectChanges(); } catch (e) { /* ignore */ }

        this.showScanModal = false;
        this.showTransactionSummaryModal = true;
      },
      error: (err: any) => {
        console.error('Error al obtener datos del empleado:', err);
        this.preview = null;
        this.calculateTransaction();
        this.showScanModal = false;
        this.showTransactionSummaryModal = true;
        this.errorGeneral = 'Error obteniendo datos del empleado/preview. Se usará cálculo local';
      }
    });
  }




  // Construye el array "details" que espera el backend a partir del carrito
  private buildDetailsForBackend(): Array<any> {
    if (!Array.isArray(this.cart) || this.cart.length === 0) return [];

    return this.cart.map((item: any) => {
      const precio = this.parseNumber(item.precio_venta ?? 0);
      const cantidad = this.parseNumber(item.cantidad ?? 1);
      const aplica_subsidio = !!item.subsidio_id;
      const subsidio_aplicado = aplica_subsidio
        ? Number((this.calcularDescuento ? this.calcularDescuento(item.subsidio || {}, precio, cantidad) : 0).toFixed(2))
        : 0.00;

      return {
        producto_id: Number(item.id),
        cantidad,
        precio_unitario: Number(precio.toFixed(2)),
        aplica_subsidio,
        subsidio_aplicado
      };
    });
  }


  // Construye los details a partir del preview del backend; fallback a buildDetailsForBackend()
  private buildDetailsFromPreview(): any[] {
    if (!this.preview || !Array.isArray(this.preview.detallesProcesados)) {
      // fallback a la función que ya existe y arma details desde el carrito
      // asegúrate de que buildDetailsForBackend existe; si no, reemplaza por tu lógica
      return typeof this.buildDetailsForBackend === 'function' ? this.buildDetailsForBackend() : (Array.isArray(this.cart) ? this.cart.map((item: any) => {
        const precio = this.parseNumber(item.precio_venta ?? 0);
        const cantidad = this.parseNumber(item.cantidad ?? 1);
        return {
          producto_id: Number(item.id),
          cantidad,
          precio_unitario: Number(precio.toFixed(2)),
          aplica_subsidio: !!item.subsidio_id,
          subsidio_aplicado: Number(((item as any).subsidio_aplicado ?? 0).toFixed ? Number((item as any).subsidio_aplicado).toFixed(2) : Number(item.subsidio_aplicado ?? 0))
        };
      }) : []);
    }

    return this.preview.detallesProcesados.map((p: any) => ({
      producto_id: Number(p.producto_id),
      cantidad: Number(p.cantidad),
      precio_unitario: Number(p.precio_unit),
      aplica_subsidio: !!p.aplica_subsidio,
      subsidio_aplicado: Number(p.subsidio_aplicado_total ?? 0),
      motivo_no_subsidio: p.motivo_no_subsidio ?? null,
      subsidio_por_unidad: Number(p.subsidio_aplicado_por_unidad ?? 0)
    }));
  }





  async validateNipAndStoreToken(): Promise<void> {
    if (!this.empleado || !this.empleado.id) {
      this.errorNipMsg = 'Empleado no identificado';
      return;
    }
    if (!this.nip) {
      this.errorNipMsg = 'Ingresa tu NIP';
      return;
    }
    this.validandoNip = true;
    this.errorNipMsg = '';
    try {
      const res: any = await this.transaccionesService.validarNip(this.empleado.id, this.nip, this.empleado.monedero?.id, 'pdv').toPromise();
      // esperar que backend devuelva nip_validation_token en body
      this.nipValidationToken = res?.nip_validation_token ?? res?.token ?? null;
      this.nipValidatedAt = Date.now();
      this.nip = ''; // limpiar NIP inmediatamente
      this.errorNipMsg = '';
    } catch (err: any) {
      if (err.status === 401) {
        this.errorNipMsg = 'NIP inválido. Inténtalo de nuevo.';
      } else if (err.status === 423) {
        this.errorNipMsg = 'Monedero bloqueado temporalmente. Contacta soporte.';
      } else if (err.status === 404) {
        this.errorNipMsg = 'Empleado no encontrado.';
      } else {
        this.errorNipMsg = 'Error del servidor. Intenta más tarde.';
      }
      this.nipValidationToken = null;
    } finally {
      this.validandoNip = false;
    }
  }


  calculateTransaction(): void {
    if (!Array.isArray(this.cart) || this.cart.length === 0) {
      this.transactionTotal = 0;
      this.subsidioTotal = 0;
      this.netTotal = 0;
      return;
    }

    // Si hay preview, usar los valores del backend (preferencia absoluta)
    if (this.preview && typeof this.preview === 'object') {
      const totalBruto = Number(this.preview.total_bruto ?? 0);

      // subsidioEstimado: preferir campo directo, si no, sumar por producto
      let subsidioEstimado = Number(this.preview.subsidio_estimado ?? 0);
      if (!subsidioEstimado) {
        const arr = Array.isArray(this.preview.subsidio_por_producto) ? this.preview.subsidio_por_producto : this.preview.detallesProcesados;
        if (Array.isArray(arr) && arr.length > 0) {
          subsidioEstimado = arr.reduce((s: number, p: any) => s + Number(p.subsidio_aplicado_total ?? p.subsidio_aplicado ?? 0), 0);
        }
      }

      const totalRecomendado = Number(this.preview.total_recomendado ?? (totalBruto - subsidioEstimado));

      this.transactionTotal = +totalBruto.toFixed(2);
      this.subsidioTotal = +subsidioEstimado.toFixed(2);
      this.netTotal = +totalRecomendado.toFixed(2);

      console.log('calculateTransaction (from preview):', this.transactionTotal, this.subsidioTotal, this.netTotal);
      return;
    }

    // Fallback: cálculo local
    const disponible = Number(this.preview?.subsidios_restantes_count ?? Infinity);
    let remaining = isFinite(disponible) ? disponible : Infinity;

    let totalSubsidio = 0;
    let netTotal = 0;

    for (const item of this.cart) {
      const precio = this.parseNumber(item.precio_venta);
      const cantidad = this.parseNumber(item.cantidad, 1);
      const subsidyPerUnit = Number((item as any).subsidio_por_unidad ?? 0);

      const applyCount = isFinite(remaining) ? Math.min(cantidad, remaining) : cantidad;
      const applied = applyCount * subsidyPerUnit;

      totalSubsidio += applied;
      if (isFinite(remaining)) remaining = Math.max(0, remaining - applyCount);

      netTotal += (precio * cantidad) - applied;
    }

    const totalBruto = netTotal + totalSubsidio;
    this.transactionTotal = +totalBruto.toFixed(2);
    this.subsidioTotal = +totalSubsidio.toFixed(2);
    this.netTotal = +netTotal.toFixed(2);

    console.log('calculateTransaction (local):', this.transactionTotal, this.subsidioTotal, this.netTotal);
  }





  // Valida NIP y, si es correcto, dispara la creación de la venta
  async validateNipAndPay(): Promise<void> {
    if (!this.empleado?.id || !this.empleado?.monedero?.id) {
      this.errorNipMsg = 'Empleado o monedero no válido';
      return;
    }

    // UI
    this.validandoNip = true;
    this.errorNipMsg = '';
    this.infoMsg = '';

    try {
      // Llamada al backend para validar NIP
      const res: any = await this.transaccionesService.validarNip(
        Number(this.empleado.id),
        String(this.nip),
        Number(this.empleado.monedero.id),
        'pdv'
      ).toPromise();

      // Backend debe devolver token de validación
      this.nipValidationToken = res?.nip_validation_token ?? res?.token ?? null;
      this.nipValidatedAt = Date.now();
      this.nip = ''; // borrar NIP por seguridad

      this.infoMsg = 'NIP correcto, procesando transacción...';

      // Llamar al flujo que crea la venta (usa nipValidationToken)
      await this.confirmMonederoPayment();

    } catch (err: any) {
      if (err && err.status === 401) {
        const attemptsLeft = err?.error?.attempts_left;
        this.errorNipMsg = attemptsLeft != null ? `NIP inválido. Quedan ${attemptsLeft} intentos.` : 'NIP inválido. Inténtalo de nuevo.';
      } else if (err && err.status === 423) {
        this.errorNipMsg = 'Monedero bloqueado temporalmente. Contacta soporte.';
      } else if (err && err.status === 404) {
        this.errorNipMsg = 'Empleado no encontrado.';
      } else {
        this.errorNipMsg = 'Error del servidor. Intenta más tarde.';
      }
    } finally {
      this.validandoNip = false;
    }
  }





  /** Confirma el pago por monedero: usa preview si existe, valida NIP, crea transacción con idempotency y reintentos */
  /** Confirma el pago por monedero: usa preview si existe, valida NIP, crea transacción con idempotency y reintentos */
  async confirmMonederoPayment(): Promise<void> {
    // Validaciones iniciales
    if (!this.empleado || !this.empleado.monedero) {
      this.errorGeneral = 'Empleado o monedero no disponible';
      console.error(this.errorGeneral);
      return;
    }
    if (this.parseNumber(this.empleado.monedero.saldo) < this.netTotal) {
      this.errorGeneral = 'Saldo insuficiente en el monedero';
      alert(this.errorGeneral);
      return;
    }

    const user_idStr = localStorage.getItem('user_id');
    const user_id = user_idStr ? Number(user_idStr) : 0;
    if (!user_id) {
      this.errorGeneral = 'Usuario no autenticado';
      console.error(this.errorGeneral);
      return;
    }

    // validar token NIP y TTL
    const now = Date.now();
    if (!this.nipValidationToken || (now - (this.nipValidatedAt || 0)) > this.NIP_TTL_MS) {
      this.errorNipMsg = 'NIP no validado o expirado. Ingresa NIP para continuar.';
      return;
    }

    // Construir details: preferir preview si está disponible
    const details = this.preview ? this.buildDetailsFromPreview() : this.buildDetailsForBackend();

    if (!Array.isArray(details) || details.length === 0) {
      this.errorGeneral = 'No hay productos válidos en el carrito';
      console.error(this.errorGeneral);
      return;
    }

    const DEFAULT_IMPUESTO_ID = 1;
    const impuestoFromItems = (this.cart || []).map((i: any) => i.impuesto_id).find((v: any) => v != null);
    const impuesto_id = (this as any).selectedTaxId ?? impuestoFromItems ?? DEFAULT_IMPUESTO_ID;

    // ------------------ AQUÍ: preferir valores del preview ------------------
    const totalReal = this.preview?.total_recomendado ?? Number(this.netTotal.toFixed(2));
    const totalSubsidio = this.preview?.subsidio_estimado ?? Number(this.subsidioTotal.toFixed(2));
    // construimos el payload usando los valores de preview
    const payload = {
      saleData: {
        empleado_id: Number(this.empleado?.id ?? 0),
        usuario_id: user_id,
        total_venta: totalReal,
        subsidio_aplicado: totalSubsidio,
        tipo_venta: "pdv",
        monedero_id: Number(this.empleado?.monedero?.id ?? 0),
        metodo_pago_id: Number(this.selectedMetodoPago?.id ?? 4),
        impuesto_id
        // opcion: enforce_inline_validation: false
      },
      details: details,
      nip_validation_token: this.nipValidationToken
    };
    // -----------------------------------------------------------------------

    console.log("Payload a enviar (confirmMonederoPayment):", payload);

    console.log('FINAL payload to send:', payload);
console.log('isMonederoMethod:', String(this.selectedMetodoPago?.codigo ?? '').toLowerCase() === 'monedero', 'nipValidationToken present:', !!this.nipValidationToken);


    // Generar idempotency key si no existe
    if (!this.idempotencyKey) {
      this.idempotencyKey = this.generateUuidV4();
      try { sessionStorage.setItem('lastIdempotencyKey', this.idempotencyKey); } catch (e) { /* ignore */ }
    }

    this.creating = true;
    try {
      const res: any = await this.attemptCreateWithBackoff(payload, this.idempotencyKey);
      if (res && res.status === 201) {
        await this.handleSuccessfulTransactionResponse(res.body);
        try { sessionStorage.removeItem('lastIdempotencyKey'); } catch (e) { /* ignore */ }
        this.clearTempState();
      } else {
        this.handleCreateErrorResponse(res);
      }
    } catch (err: any) {
      this.handleCreateException(err);
    } finally {
      this.creating = false;
    }
  }





  // --- Helpers para crear con backoff y manejo de errores ---

  private async attemptCreateWithBackoff(payload: any, idempotencyKey: string): Promise<any> {
    let attempt = 0;
    let delayMs = 300;
    while (attempt < this.MAX_CREATE_RETRIES) {
      attempt++;
      try {
        const response: any = await this.transaccionesService.crearTransaccion(payload, idempotencyKey).toPromise();
        return response;
      } catch (err: any) {
        // si es 4xx no reintentamos
        if (err && err.status >= 400 && err.status < 500) {
          throw err;
        }
        if (attempt >= this.MAX_CREATE_RETRIES) {
          throw err;
        }
        await this.delay(delayMs);
        delayMs *= 3;
      }
    }
    throw new Error('Máximo intentos alcanzado');
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleCreateErrorResponse(res: any) {
    const status = res?.status;
    const body = res?.body ?? res;
    console.warn('handleCreateErrorResponse', status, body);

    if (status === 409) {
      this.errorGeneral = 'Operación en progreso. Espera un momento.';
    } else if (status === 400 && body?.reason === 'missing_nip_token_inline') {
      this.errorNipMsg = 'Se requiere validación de NIP antes de completar la venta.';
      this.nipValidationToken = null;
    } else if (status === 401 && (body?.reason === 'token_already_consumed' || body?.reason === 'token_expired')) {
      this.errorNipMsg = 'Token NIP expirado o consumido. Ingresa NIP nuevamente.';
      this.nipValidationToken = null;
    } else if (status === 422 || status === 400) {
      this.errorGeneral = body?.message ?? 'Datos inválidos. Revisa los campos.';
    } else {
      this.errorGeneral = 'Error del servidor. Intenta de nuevo.';
    }
  }

  private handleCreateException(err: any) {
    console.error('handleCreateException', err);
    if (err && err.status === 409) {
      this.errorGeneral = 'Operación en progreso. Espera un momento.';
      return;
    }
    this.errorGeneral = 'Error creando la venta. Puedes reintentar. Si el problema persiste, intenta más tarde.';
  }

  private clearTempState() {
    this.idempotencyKey = null;
    this.nipValidationToken = null;
    this.nipValidatedAt = 0;
    this.nip = '';
  }

  private generateUuidV4(): string {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
      // @ts-ignore
      return (crypto as any).randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }


  // Maneja respuesta exitosa y construye receipt consistente con backend/preview
private async handleSuccessfulTransactionResponse(body: any) {
  console.log('Venta creada - respuesta backend:', body);

  alert(`Venta registrada con ${this.selectedMetodoPago?.nombre ?? 'método'}`);

  const esMonedero = !!this.isVentaMonedero || (this.selectedMetodoPago?.codigo?.toLowerCase() === 'monedero');

  // Preferir datos del backend; fallback a preview; fallback a cálculos locales
  const backend = body ?? {};
  const total_bruto = backend.total_bruto ?? this.preview?.total_bruto ?? Number(this.transactionTotal || 0);
  const total_subsidio = backend.subsidio_aplicado ?? this.preview?.subsidio_estimado ?? Number(this.subsidioTotal || 0);
  const total_neto = backend.total_venta ?? this.preview?.total_recomendado ?? Number(this.netTotal || 0);

  // Items: preferir backend.details, luego preview, luego cart
  let itemsForReceipt: any[] = [];
  if (Array.isArray(backend.details) && backend.details.length > 0) {
    itemsForReceipt = backend.details.map((it: any) => ({
      nombre: it.nombre ?? `Producto ${it.producto_id}`,
      cantidad: Number(it.cantidad ?? 0),
      precio_unitario: Number(it.precio_unitario ?? it.precio_unit ?? 0),
      subtotal: Number(((it.precio_unitario ?? it.precio_unit ?? 0) * (it.cantidad ?? 0)).toFixed(2)),
      subsidio_aplicado: Number(it.subsidio_aplicado ?? it.subsidio_aplicado_total ?? 0)
    }));
  } else if (Array.isArray(this.preview?.detallesProcesados) && this.preview.detallesProcesados.length > 0) {
    itemsForReceipt = this.preview.detallesProcesados.map((p: any) => ({
      nombre: `Producto ${p.producto_id}`,
      cantidad: Number(p.cantidad),
      precio_unitario: Number(p.precio_unit),
      subtotal: Number((p.precio_unit * p.cantidad).toFixed(2)),
      subsidio_aplicado: Number(p.subsidio_aplicado_total ?? 0)
    }));
  } else {
    itemsForReceipt = this.cart.map(it => ({
      nombre: it.nombre,
      cantidad: Number(it.cantidad || 0),
      precio_unitario: Number(it.precio_venta || 0),
      subtotal: Number(((it.precio_venta || 0) * (it.cantidad || 0)).toFixed(2)),
      subsidio_aplicado: Number((it as any).subsidio_aplicado ?? 0)
    }));
  }

  const subsidios_restantes_count = backend.subsidios_restantes_count ?? this.preview?.subsidios_restantes_count;

  // Monedero info: preferir backend, fallback a calculo local usando this.empleado.monedero.saldo
  let monederoInfo: { saldo_anterior: number, saldo_final: number } | undefined = undefined;
  if (esMonedero) {
    const backendSaldoAnt = backend.monedero_saldo_anterior ?? backend.saldo_anterior ?? null;
    const backendSaldoFin = backend.monedero_saldo_actual ?? backend.saldo_final ?? null;
    if (backendSaldoAnt !== null || backendSaldoFin !== null) {
      monederoInfo = {
        saldo_anterior: Number(backendSaldoAnt ?? 0),
        saldo_final: Number(backendSaldoFin ?? 0)
      };
    } else if (this.empleado?.monedero) {
      const saldoAnterior = Number(this.empleado.monedero.saldo ?? 0);
      const saldoFinal = Number((saldoAnterior - Number(total_neto)).toFixed(2));
      monederoInfo = { saldo_anterior: saldoAnterior, saldo_final: saldoFinal };
    }
  }

  // Efectivo: preferir campos del backend, fallback a this.montoRecibido y calculo local
  const efectivoEntregadoBackend = backend.efectivo_entregado ?? backend.efectivo_recibido ?? backend.cash_received ?? null;
  const cambioBackend = backend.cambio ?? backend.change ?? null;
  const efectivo_entregado = efectivoEntregadoBackend != null ? Number(efectivoEntregadoBackend) :
    (typeof (this.montoRecibido) !== 'undefined' ? Number(this.montoRecibido) : null);
  let cambio = cambioBackend != null ? Number(cambioBackend) : null;
  if ((cambio === null || Number.isNaN(cambio)) && efectivo_entregado != null) {
    const calc = Number(efectivo_entregado) - Number(total_neto);
    cambio = Number.isFinite(calc) ? Number(calc.toFixed(2)) : null;
  }

  // Construir receipt con propiedades esperadas por printReceipt
  const receipt: any = {
    tipo: esMonedero ? 'monedero' : 'normal',
    venta: {
      venta_id: backend.venta_id ?? backend.id ?? null,
      referencia: backend.referencia ?? null,
      usuario_nombre: localStorage.getItem('user_name') || undefined,
      empleado_nombre: this.empleado?.nombre ?? 'Cajero',
      fecha: new Date().toLocaleString(),
      items: itemsForReceipt,
      total_bruto: Number(total_bruto),
      total_subsidio: Number(total_subsidio),
      total_neto: Number(total_neto),
      // Asegurar nombres y códigos normalizados para printReceipt
      metodo_nombre: this.selectedMetodoPago?.nombre ?? backend.metodo_pago?.nombre ?? backend.metodo_nombre ?? null,
      metodo_codigo: (this.selectedMetodoPago?.codigo ?? backend.metodo_pago?.codigo ?? backend.metodo_codigo ?? '').toString().toLowerCase(),
      efectivo_entregado: efectivo_entregado,
      cambio: cambio
    },
    monedero: monederoInfo,
    subsidios_restantes_count
  };

  // Impresión (no bloqueante si falla)
  try {
    const selectedPrinter = localStorage.getItem('selected_printer') || '';
    if (selectedPrinter) {
      await this.printerService.printReceipt(selectedPrinter, receipt);
    } else {
      console.warn('No printer selected');
    }
  } catch (err) {
    console.error('Error printing receipt:', err);
  }

  // Actualizar UI y limpiar
  if (esMonedero && this.empleado && this.empleado.monedero && receipt.monedero) {
    this.empleado.monedero.saldo = receipt.monedero.saldo_final;
  }

  // Actualizar preview.subsidios_restantes_count si viene
  if (typeof receipt.subsidios_restantes_count !== 'undefined') {
    this.preview = this.preview ?? {};
    this.preview.subsidios_restantes_count = receipt.subsidios_restantes_count;
  }

  this.cart = [];
  this.empleado = null;
  this.transactionTotal = 0;
  this.subsidioTotal = 0;
  this.netTotal = 0;
  this.closeModals();
}








  /** Muestra el modal para venta normal y carga los métodos de pago desde el servicio */
  processVentaNormal(): void {
    console.log('Procesando venta normal');
    // reset mínimos antes de mostrar
    this.selectedMetodoPago = null;
    this.isVentaMonedero = false;
    this.montoRecibido = 0;

    this.metodosPagoService.listarMetodosPago().subscribe({
      next: (response) => {
        this.metodosPago = response;
        this.showPaymentMethodModal = true;
        console.log('processVentaNormal: métodos cargados, modal mostrado');
      },
      error: (err) => console.error('Error obteniendo métodos de pago:', err)
    });
  }


  /** Selecciona un método de pago cuando se hace clic sobre uno */
  seleccionarMetodoPago(metodo: any): void {
     console.log("Método seleccionado:", metodo);
  const codigo = String(metodo?.codigo ?? '').toLowerCase();
  this.selectedMetodoPago = metodo;

  if (codigo === 'monedero') {
    // flujo especial: escaneo / NIP para monedero
    this.chooseVentaPorMonedero();
    return;
  }
  }





async confirmarVenta(): Promise<void> {
  if (!this.selectedMetodoPago) return;

  console.log('confirmarVenta START - selectedMetodoPago:', this.selectedMetodoPago);
console.log('selectedMetodoPago.codigo:', String(this.selectedMetodoPago?.codigo).toLowerCase(), 'requiere_validacion:', this.selectedMetodoPago?.requiere_validacion);


  const user_idStr = localStorage.getItem('user_id');
  const usuario_id = user_idStr ? Number(user_idStr) : 0;
  if (!usuario_id) {
    console.error('No se encontró un usuario logueado válido. user_id:', usuario_id);
    return;
  }

  if (!Array.isArray(this.cart) || this.cart.length === 0) {
    alert('El carrito está vacío');
    return;
  }

  const DEFAULT_IMPUESTO_ID = 1;
  const impuestoFromItems = this.cart
    .map(i => (i as any).impuesto_id)
    .find(v => v != null);
  const impuesto_id = (this as any).selectedTaxId ?? impuestoFromItems ?? DEFAULT_IMPUESTO_ID;

  // Normalizar details
  const details = this.cart.map(item => {
    const precio = item.precio_venta != null ? Number(item.precio_venta) : 0;
    const cantidad = item.cantidad != null ? Number(item.cantidad) : 0;
    return {
      producto_id: Number(item.id),
      cantidad,
      precio_unitario: Number(precio.toFixed(2))
    };
  });

  if (!Array.isArray(details) || details.length === 0) {
    alert('No hay detalles válidos para la venta');
    return;
  }
  if (!impuesto_id) {
    alert('Falta impuesto para la venta');
    return;
  }

  // Determinar si el método es Monedero (solo en ese caso aplicará NIP en frontend)
  const isMonederoMethod = String(this.selectedMetodoPago?.codigo ?? '').toLowerCase() === 'monedero';

  // Si es Monedero, exigir token válido; si no existe, abrir modal NIP / detener flujo
  if (isMonederoMethod) {
    const now = Date.now();
    const tokenValid = !!this.nipValidationToken && (now - (this.nipValidatedAt || 0) <= (this.NIP_TTL_MS || 300000));
    if (!tokenValid) {
      this.errorNipMsg = 'Este método requiere validación NIP. Ingresa tu NIP.';
      // Aquí debes abrir el modal de NIP o enfocar el input para que el cajero ingrese el NIP.
      // No continuar con la creación hasta obtener token.
      return;
    }
  }

  console.log('empleado id / monedero id:', Number(this.empleado?.id ?? 0), this.empleado?.monedero?.id ?? null);
console.log('isVentaMonedero flag:', this.isVentaMonedero);

  // Construir saleData
  const saleData: any = {
    empleado_id: Number(this.empleado?.id ?? 0),
    usuario_id: usuario_id,
    total_venta: Number(this.transactionTotal) || 0,
    subsidio_aplicado: 0,
    tipo_venta: 'pdv',
    monedero_id: isMonederoMethod ? Number(this.empleado?.monedero?.id ?? 0) : null,
    metodo_pago_id: Number(this.selectedMetodoPago?.id ?? 0),
    impuesto_id
  };

  console.log('saleData provisional:', {
  empleado_id: Number(this.empleado?.id ?? 0),
  metodo_pago_id: Number(this.selectedMetodoPago?.id ?? 0),
  monedero_id: this.isVentaMonedero ? Number(this.empleado?.monedero?.id ?? 0) : null
});


  // Construir payload e incluir nip_validation_token solo si aplica
  const payload: any = { saleData, details };
  if (isMonederoMethod && this.nipValidationToken) {
    payload.nip_validation_token = this.nipValidationToken;
  }

  // Generar idempotencyKey si no existe y guardarla ANTES de hacer logs / POST
  console.log('FINAL payload to send:', payload);
console.log('isMonederoMethod:', String(this.selectedMetodoPago?.codigo ?? '').toLowerCase() === 'monedero', 'nipValidationToken present:', !!this.nipValidationToken);

  if (!this.idempotencyKey) {
    this.idempotencyKey = this.generateUuidV4();
    try { sessionStorage.setItem('lastIdempotencyKey', this.idempotencyKey); } catch (e) { /* ignore */ }
  }

  console.log('Payload venta normal (enviado):', payload);
  console.log('Using idempotencyKey before create:', this.idempotencyKey);

  this.creating = true;
  try {
    const res: any = await this.attemptCreateWithBackoff(payload, this.idempotencyKey);
    if (res && res.status === 201) {
      await this.handleSuccessfulTransactionResponse(res.body);
      try { sessionStorage.removeItem('lastIdempotencyKey'); } catch (e) { /* ignore */ }
      this.clearTempState();
    } else {
      this.handleCreateErrorResponse(res);
    }
  } catch (err: any) {
    if (err && err.status) {
      if (err.status === 401 || err.status === 403) {
        alert('Autorización requerida. Por favor inicia sesión de nuevo.');
      } else if (err.status === 409) {
        this.errorGeneral = 'Operación en progreso. Espera un momento.';
      } else {
        this.errorGeneral = err?.error?.message ?? 'Error al procesar la venta. Intenta de nuevo.';
      }
    } else {
      this.errorGeneral = 'Error creando la venta. Puedes reintentar más tarde.';
    }
    console.error('Crear transacción - status:', err.status, 'body:', err.error || err);
  } finally {
    this.creating = false;
  }
}



  












  // Puedes reutilizar processPaymentEfectivo() para validar que el monto recibido es suficiente
  processPaymentEfectivo(): void {
    if (this.montoRecibido < this.transactionTotal) {
      alert("El monto ingresado no es suficiente.");
      return;
    }
    // Se calcula el cambio y luego se procede a confirmar la venta normal
    const cambio = this.montoRecibido - this.transactionTotal;
    alert(`Monto recibido: $${this.montoRecibido}. Cambio a devolver: $${cambio.toFixed(2)}`);
    // Llama a confirmarVenta() para enviar la transacción al backend:
    this.confirmarVenta();
  }

  // Este método se invoca cada vez que el usuario presiona un botón del teclado numérico
  ingresaNumero(numero: string): void {
    // Convertimos el monto actual a string, concatenamos el nuevo dígito y lo convertimos a número
    const nuevoValor = this.montoRecibido.toString() + numero;
    this.montoRecibido = parseFloat(nuevoValor);
  }

  // Método para borrar (resetear) el monto ingresado
  borrar(): void {
    this.montoRecibido = 0;
  }
  /** Método stub para la venta con tarjeta (podrías agregar confirmación de cobro en la terminal) */
  processPaymentTarjeta(): void {
    // Aquí podrías desplegar un mensaje para que el cajero cobre en la terminal
    alert("Cobrar en la terminal y luego presiona aceptar para finalizar el pago.");
    this.confirmarVenta();
  }
}