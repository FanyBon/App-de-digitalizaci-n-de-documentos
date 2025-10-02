import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { switchMap, map } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { ProductosService, Producto } from '../../../services/productos/productos.service';
import { FamiliaProductoService, FamiliaProducto } from '../../../services/productos/familias-productos.service';
import { EmpleadosService } from '../../../services/sistemas/control_comidas/empleados.service';
import { MonederosService } from 'src/app/services/recargas/monederos.service';
import { TransaccionesService } from '../../../services/ventas/transacciones.service';
import { SubsidiosService } from '../../../services/ventas/subsidios.service';
import { MetodosPagoService } from '../../../services/recargas/metodos-pago.service';
import { PrinterService } from 'src/app/services/printer/printer.service';

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
    private printerService: PrinterService
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



  scanEmployee(): void {
    if (!this.scanCode) {
      return;
    }
    this.empleadoService.buscarEmpleados(this.scanCode).pipe(
      switchMap((empleados: any[]) => {
        console.log("Empleados encontrados:", empleados);
        if (empleados.length === 0) {
          throw new Error("Empleado no encontrado");
        }
        const empleadoEncontrado = empleados[0]; // Tomamos el primer empleado
        console.log("Empleado seleccionado:", empleadoEncontrado);
        // Utilizamos el monedero_id para obtener el monedero, sin devolver un array,
        // usando el operador map para transformar el valor.
        return this.monederosService.obtenerMonederoPorEmpleado(empleadoEncontrado.monedero_id).pipe(
          map((monedero: any) => {
            console.log("Monedero obtenido:", monedero);
            empleadoEncontrado.monedero = {
              id: monedero.id,
              saldo: parseFloat(monedero.saldo_actual)
            };
            return empleadoEncontrado;
          })
        );
      })
    ).subscribe({
      next: (empleado: Empleado) => {
        this.empleado = empleado;
        console.log("Empleado final con monedero asignado:", this.empleado);
        this.showScanModal = false;
        this.calculateTransaction();
        this.showTransactionSummaryModal = true;
      },
      error: (err: any) => console.error('Error al obtener datos del empleado:', err)
    });
  }

  calculateTransaction(): void {
    if (this.cart.length === 0) {
      this.transactionTotal = 0;
      this.subsidioTotal = 0;
      this.netTotal = 0;
      return;
    }

    const observables = this.cart.map(item => {
      if (item.subsidio_id) {
        return this.subsidiosService.obtenerSubsidio(item.subsidio_id).pipe(
          map((subsidio: any) => {
            const price = this.parseNumber(item.precio_venta);
            const cantidad = this.parseNumber(item.cantidad, 1);
            const discount = this.calcularDescuento(subsidio, price, cantidad);
            return { item, discount };
          })
        );
      } else {
        return of({ item, discount: 0 });
      }
    });

    forkJoin(observables).subscribe(results => {
      let totalSubsidio = 0;
      let netTotal = 0;
      results.forEach(({ item, discount }) => {
        totalSubsidio += discount;
        const precioNum = this.parseNumber(item.precio_venta);
        const cantidadNum = this.parseNumber(item.cantidad, 1);
        netTotal += (precioNum * cantidadNum) - discount;
      });

      const totalBruto = netTotal + totalSubsidio;
      this.transactionTotal = +totalBruto.toFixed(2);
      this.subsidioTotal = +totalSubsidio.toFixed(2);
      this.netTotal = +netTotal.toFixed(2);

      console.log("Totales calculados:", this.transactionTotal, this.subsidioTotal, this.netTotal);
    });
  }


  /** Confirma el pago por monedero, validando si el saldo es suficiente */
  confirmMonederoPayment(): void {
    if (!this.empleado || !this.empleado.monedero) {
      console.error('Empleado o monedero faltante');
      return;
    }
    if (this.parseNumber(this.empleado.monedero.saldo) < this.netTotal) {
      console.log('Saldo insuficiente en el monedero');
      return;
    }

    const user_idStr = localStorage.getItem('user_id');
    const user_id = user_idStr ? Number(user_idStr) : 0;
    if (!user_id) {
      console.error('No se encontró un usuario logueado válido. user_id:', user_id);
      return;
    }

    // Materializar referencias para que TS sepa que no son null/undefined
    const empleadoSeleccionado = this.empleado!;
    const monederoSeleccionado = empleadoSeleccionado.monedero!;

    const detailObservables = this.cart.map(item => {
      if (item.subsidio_id) {
        return this.subsidiosService.obtenerSubsidio(item.subsidio_id).pipe(
          map((subsidio: any) => {
            const precio = this.parseNumber(item.precio_venta);
            const cantidad = this.parseNumber(item.cantidad, 1);
            const discount = this.calcularDescuento(subsidio, precio, cantidad);
            return {
              producto_id: Number(item.id),
              cantidad,
              precio_unitario: Number(precio.toFixed(2)),
              subsidio_aplicado: Number(discount.toFixed(2))
            };
          })
        );
      } else {
        const precio = this.parseNumber(item.precio_venta);
        return of({
          producto_id: Number(item.id),
          cantidad: this.parseNumber(item.cantidad, 1),
          precio_unitario: Number(precio.toFixed(2)),
          subsidio_aplicado: 0.00
        });
      }
    });

    forkJoin(detailObservables).subscribe((details: any[]) => {
      if (!Array.isArray(details) || details.length === 0) {
        console.error('Detalles vacíos al construir payload por monedero');
        return;
      }

      const DEFAULT_IMPUESTO_ID = 1;
      const impuestoFromItems = this.cart.map(i => (i as any).impuesto_id).find(v => v != null);
      const impuesto_id = (this as any).selectedTaxId ?? impuestoFromItems ?? DEFAULT_IMPUESTO_ID;

      const payload = {
        saleData: {
          empleado_id: Number(empleadoSeleccionado.id),
          usuario_id: user_id,
          total_venta: Number(this.netTotal) || 0,
          subsidio_aplicado: Number(this.subsidioTotal) || 0,
          tipo_venta: "pdv",
          monedero_id: Number(monederoSeleccionado.id),
          metodo_pago_id: Number(this.selectedMetodoPago?.id ?? 4),
          impuesto_id
        },
        details: details
      };

      console.log("Payload enviado:", payload);
      this.transaccionesService.procesarTransaccion(payload).subscribe({
        next: async (response: any) => {
          // Logs diagnósticos
          console.log('DEBUG_PRINT: next handler ENTER - response:', response);
          console.log('DEBUG_PRINT: this.cart:', JSON.parse(JSON.stringify(this.cart)));
          console.log('DEBUG_PRINT: selectedMetodoPago:', this.selectedMetodoPago);
          console.log('DEBUG_PRINT: transactionTotal/subsidio/net:', this.transactionTotal, this.subsidioTotal, this.netTotal);

          alert(`Venta registrada con ${this.selectedMetodoPago?.nombre ?? 'método'}`);

          // Determinar si es venta por monedero
          const esMonedero = !!this.isVentaMonedero || (this.selectedMetodoPago?.codigo?.toLowerCase() === 'monedero');

          // Preparar datos del receipt (comunes)
          const itemsForReceipt = this.cart.map(it => ({
            nombre: it.nombre,
            cantidad: Number(it.cantidad || 0),
            precio_unitario: Number(it.precio_venta || 0),
            subtotal: Number(((it.precio_venta || 0) * (it.cantidad || 0)).toFixed(2)),
            subsidio_aplicado: Number((it as any).subsidio_aplicado ?? 0)
          }));

          // Datos específicos de monedero
          let monederoInfo: { saldo_anterior: number, saldo_final: number } | undefined = undefined;
          if (esMonedero && this.empleado?.monedero) {
            const saldoAnterior = Number(this.empleado.monedero.saldo ?? 0);
            const saldoFinal = Number((saldoAnterior - this.netTotal).toFixed(2));
            monederoInfo = { saldo_anterior: saldoAnterior, saldo_final: saldoFinal };
          }

          // Construir objeto receipt
          const receipt = {
            tipo: esMonedero ? 'monedero' as const : 'normal' as const,
            venta: {
              venta_id: response?.venta_id,
              referencia: response?.referencia,
              usuario_nombre: localStorage.getItem('user_name') || undefined,
              empleado_nombre: this.empleado?.nombre ?? 'Cajero',
              fecha: new Date().toLocaleString(),
              items: itemsForReceipt,
              total_bruto: Number(this.transactionTotal || 0),
              total_subsidio: Number(this.subsidioTotal || 0),
              total_neto: Number(this.netTotal || 0),
              metodo_pago: this.selectedMetodoPago?.nombre
            },
            monedero: monederoInfo
          };

          // Intentar imprimir (no bloquear el flujo si falla)
          try {
            const selectedPrinter = localStorage.getItem('selected_printer') || '';
            console.log('DEBUG_PRINT: attempting print on printer:', selectedPrinter);
            console.log('DEBUG_PRINT: selectedPrinter before print:', selectedPrinter);
            console.log('DEBUG_PRINT: receipt.items count:', receipt.venta.items.length);

            if (!selectedPrinter) {
              console.warn('DEBUG_PRINT: No selected printer, skipping print');
            } else {
              try {
                await this.printerService.printReceipt(selectedPrinter, receipt);
                console.log('DEBUG_PRINT: printReceipt resolved (first attempt)');
              } catch (err) {
                console.error('DEBUG_PRINT: printReceipt error (first attempt):', err);
                // reintento con reconexión
                try {
                  await this.printerService.connect();
                  await this.printerService.printReceipt(selectedPrinter, receipt);
                  console.log('DEBUG_PRINT: printReceipt resolved (after reconnect)');
                } catch (err2) {
                  console.error('DEBUG_PRINT: print failed after reconnect:', err2);
                }
              }
            }
          } catch (e) {
            console.error('DEBUG_PRINT: unexpected error while printing:', e);
          }

          // Si fue monedero, actualizar saldo local en UI
          if (esMonedero && this.empleado && this.empleado.monedero && receipt.monedero) {
            this.empleado.monedero.saldo = receipt.monedero.saldo_final;
          }

          // Limpieza y cierre (solo después de intentar imprimir)
          this.cart = [];
          // Si era monedero, dejamos empleado null; si quieres mantener empleado para otro uso, ajusta aquí
          this.empleado = null;
          this.transactionTotal = 0;
          this.subsidioTotal = 0;
          this.netTotal = 0;
          this.closeModals();
        },



        error: (err: any) => console.error('Error procesando la transacción:', err)
      });
    });
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
    // Convertir a minúsculas para comparar sin importar la capitalización:
    if (metodo.codigo && metodo.codigo.toLowerCase() === 'monedero') {
      this.selectedMetodoPago = metodo;
      this.chooseVentaPorMonedero();  // Debería cerrar el modal de métodos y abrir el modal de escaneo
    } else {
      this.selectedMetodoPago = metodo;
      // Aquí continúa el flujo normal para otros métodos.
    }
  }








  /** Confirma la venta normal una vez que se seleccionó el método de pago, 
     y valida (por ejemplo, para efectivo, el monto recibido y calcula cambio). */
  confirmarVenta(): void {
    if (!this.selectedMetodoPago) return;

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

    // Construir details (array separado)
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

    const saleData = {
      empleado_id: 50,
      usuario_id,
      total_venta: Number(this.transactionTotal) || 0,
      subsidio_aplicado: 0,
      tipo_venta: 'pdv',
      monedero_id: 26,
      metodo_pago_id: Number(this.selectedMetodoPago.id),
      impuesto_id
    };

    const payload = { saleData, details };

    console.log('Payload venta normal (enviado):', payload);

    this.transaccionesService.procesarTransaccion(payload).subscribe({
      next: async (response: any) => {
        // Logs diagnósticos
        console.log('DEBUG_PRINT: next handler ENTER - response:', response);
        console.log('DEBUG_PRINT: this.cart:', JSON.parse(JSON.stringify(this.cart)));
        console.log('DEBUG_PRINT: selectedMetodoPago:', this.selectedMetodoPago);
        console.log('DEBUG_PRINT: transactionTotal/subsidio/net:', this.transactionTotal, this.subsidioTotal, this.netTotal);

        alert(`Venta registrada con ${this.selectedMetodoPago?.nombre ?? 'método'}`);

        // Determinar si es venta por monedero
        const esMonedero = !!this.isVentaMonedero || (this.selectedMetodoPago?.codigo?.toLowerCase() === 'monedero');

        // Preparar datos del receipt (comunes)
        const itemsForReceipt = this.cart.map(it => ({
          nombre: it.nombre,
          cantidad: Number(it.cantidad || 0),
          precio_unitario: Number(it.precio_venta || 0),
          subtotal: Number(((it.precio_venta || 0) * (it.cantidad || 0)).toFixed(2)),
          subsidio_aplicado: Number((it as any).subsidio_aplicado ?? 0)
        }));

        // Datos específicos de monedero
        let monederoInfo: { saldo_anterior: number, saldo_final: number } | undefined = undefined;
        if (esMonedero && this.empleado?.monedero) {
          const saldoAnterior = Number(this.empleado.monedero.saldo ?? 0);
          const saldoFinal = Number((saldoAnterior - this.netTotal).toFixed(2));
          monederoInfo = { saldo_anterior: saldoAnterior, saldo_final: saldoFinal };
        }

        // Antes de intentar imprimir, construir receipt completo
        const metodo_codigo = this.selectedMetodoPago?.codigo?.toLowerCase() ?? '';
        // calcular cambio solo si pago en efectivo y montoRecibido existe
        const cambio = (metodo_codigo === 'efectivo' && this.montoRecibido)
          ? Number((this.montoRecibido - this.transactionTotal).toFixed(2))
          : 0;

        // Construir objeto receipt
        const receipt = {
          tipo: esMonedero ? 'monedero' as const : 'normal' as const,
          venta: {
            venta_id: response?.venta_id,
            referencia: response?.referencia,
            usuario_nombre: localStorage.getItem('user_name') || undefined,
            usuario_codigo: localStorage.getItem('user_code') || undefined, // opcional
            empleado_nombre: this.empleado?.nombre ?? 'Cajero',
            fecha: new Date().toLocaleString(),
            metodo_codigo: metodo_codigo,
            metodo_nombre: this.selectedMetodoPago?.nombre,
            cambio: cambio,
            items: itemsForReceipt,
            total_bruto: Number(this.transactionTotal || 0),
            total_subsidio: Number(this.subsidioTotal || 0),
            total_neto: Number(this.netTotal || 0)
          },
          monedero: monederoInfo
        };

        // Intentar imprimir (no bloquear el flujo si falla)
        try {
          const selectedPrinter = localStorage.getItem('selected_printer') || '';
          console.log('DEBUG_PRINT: attempting print on printer:', selectedPrinter);
          console.log('DEBUG_PRINT: selectedPrinter before print:', selectedPrinter);
          console.log('DEBUG_PRINT: receipt.items count:', receipt.venta.items.length);

          if (!selectedPrinter) {
            console.warn('DEBUG_PRINT: No selected printer, skipping print');
          } else {
            try {
              await this.printerService.printReceipt(selectedPrinter, receipt);
              console.log('DEBUG_PRINT: printReceipt resolved (first attempt)');
            } catch (err) {
              console.error('DEBUG_PRINT: printReceipt error (first attempt):', err);
              // reintento con reconexión
              try {
                await this.printerService.connect();
                await this.printerService.printReceipt(selectedPrinter, receipt);
                console.log('DEBUG_PRINT: printReceipt resolved (after reconnect)');
              } catch (err2) {
                console.error('DEBUG_PRINT: print failed after reconnect:', err2);
              }
            }
          }
        } catch (e) {
          console.error('DEBUG_PRINT: unexpected error while printing:', e);
        }

        // Si fue monedero, actualizar saldo local en UI
        if (esMonedero && this.empleado && this.empleado.monedero && receipt.monedero) {
          this.empleado.monedero.saldo = receipt.monedero.saldo_final;
        }

        // Limpieza y cierre (solo después de intentar imprimir)
        this.cart = [];
        // Si era monedero, dejamos empleado null; si quieres mantener empleado para otro uso, ajusta aquí
        this.empleado = null;
        this.transactionTotal = 0;
        this.subsidioTotal = 0;
        this.netTotal = 0;
        this.closeModals();
      },

      error: (err: any) => {
        console.error('Error en venta normal:', err);
        alert(err?.error?.error || 'Error al procesar la venta');
      }
    });
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
