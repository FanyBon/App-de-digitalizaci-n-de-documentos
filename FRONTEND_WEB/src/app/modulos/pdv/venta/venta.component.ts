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

/* Interfaces para la identificación del producto */
interface CartItem extends Producto {
  cantidad: number;
}
/* Interfaces para la identificación del empleado y su monedero */
interface Monedero {
  id: number;
  saldo: number;
}
/* Interfaces para la identificación del empleado */
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
  // Variables de búsqueda y productos
  searchTerm: string = '';
  // Productos tomados desde el backend
  products: Producto[] = [];
  // Carrito de la venta
  cart: CartItem[] = [];
  // Estados para controlar los modales
  showSaleTypeModal: boolean = false;
  showScanModal: boolean = false;
  showTransactionSummaryModal: boolean = false;
  isVentaMonedero: boolean = false;
  // Variable para el código escaneado
  scanCode: string = '';
  // Datos del empleado (resultado de la búsqueda)
  empleado: Empleado | null = null;
  // Variables para el resumen de la transacción
  transactionTotal: number = 0;  // Suma total de productos sin descuento
  subsidioTotal: number = 0;     // Total del subsidio aplicado
  netTotal: number = 0;          // Total a pagar luego del subsidio
  // Lista de familias (categorías)
  familias: FamiliaProducto[] = [];
  // Almacena la familia seleccionada (null = sin filtro, es decir, "Todos")
  selectedFamily: number | null = null;
  // Propiedades para la venta normal con método de pago
  showPaymentMethodModal: boolean = false;
  metodosPago: any[] = [];
  selectedMetodoPago: any = null;
  montoRecibido: number = 0; // Solo para pago en efectivo

  constructor(  // Inyectamos los diferetes servicio que vamos a usar
    private productosService: ProductosService,
    private familiaService: FamiliaProductoService,
    private empleadoService: EmpleadosService,
    private monederosService: MonederosService,
    private transaccionesService: TransaccionesService,
    private subsidiosService: SubsidiosService,
    private metodosPagoService: MetodosPagoService
  ) { }

  ngOnInit(): void {
    this.obtenerProductos();
    this.obtenerFamilias();
  }

  /** Obtiene productos desde el backend */
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
    this.showPaymentMethodModal = false;
    this.isVentaMonedero = true;
    this.showScanModal = true;
    this.showSaleTypeModal = false;
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
    // Si el carrito está vacío, asignamos ceros y salimos
    if (this.cart.length === 0) {
      this.transactionTotal = 0;
      this.subsidioTotal = 0;
      this.netTotal = 0;
      return;
    }

    const observables = this.cart.map(item => {
      // Si existe subsidio_id, consultamos el subsidio y calculamos el descuento
      if (item.subsidio_id) {
        return this.subsidiosService.obtenerSubsidio(item.subsidio_id).pipe(
          map((subsidio: any) => {
            const porcentaje = parseFloat(subsidio.porcentaje.toString()) / 100;  // Ej.: "30.00" -> 0.3
            const price = parseFloat(item.precio_venta.toString());
            const discount = price * porcentaje * item.cantidad;
            return { item, discount };
          })
        );
      } else {
        // Si no tiene subsidio, devolvemos un observable que emite un objeto con descuento 0.
        return of({ item, discount: 0 });
      }
    });

    // Esperamos a que se resuelvan todas las consultas de subsidios
    forkJoin(observables).subscribe(results => {
      let totalSubsidio = 0;
      let netTotal = 0;
      results.forEach(({ item, discount }) => {
        totalSubsidio += discount;
        // Suma neta: se descuenta el descuento (subsidio) de la suma del precio * cantidad
        netTotal += (parseFloat(item.precio_venta.toString()) * item.cantidad) - discount;
      });

      // Si consideramos que "transactionTotal" es el total de productos sin descontar subsidios,
      // podrías calcularlo de la siguiente forma:
      const totalBruto = netTotal + totalSubsidio;

      // Asignamos los totales a las variables vinculadas a la vista
      this.transactionTotal = totalBruto;
      this.subsidioTotal = totalSubsidio;
      this.netTotal = netTotal;

      console.log("Totales calculados:", this.transactionTotal, this.subsidioTotal, this.netTotal);
    });
  }

  /** Confirma el pago por monedero, validando si el saldo es suficiente */
  confirmMonederoPayment(): void {
    if (!this.empleado || !this.empleado.monedero) return;
    if (this.empleado.monedero.saldo < this.netTotal) {
      console.log('Saldo insuficiente en el monedero');
      return;
    }

    const user_idStr = localStorage.getItem('user_id');
    const user_id = user_idStr ? Number(user_idStr) : 0;
    if (!user_id) {
      console.error('No se encontró un usuario logueado válido. user_id:', user_id);
      return;
    }

    const detailObservables = this.cart.map(item => {
      if (item.subsidio_id) {
        return this.subsidiosService.obtenerSubsidio(item.subsidio_id).pipe(
          map((subsidio: any) => {
            const porcentaje = parseFloat(subsidio.porcentaje.toString()) / 100;
            const discount = parseFloat(item.precio_venta.toString()) * porcentaje * item.cantidad;
            return {
              producto_id: item.id,
              cantidad: item.cantidad,
              precio_unitario: parseFloat(item.precio_venta.toString()),
              subsidio_aplicado: parseFloat(discount.toFixed(2))
            };
          })
        );
      } else {
        return of({
          producto_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: parseFloat(item.precio_venta.toString()),
          subsidio_aplicado: 0.00
        });
      }
    });

    forkJoin(detailObservables).subscribe((details: any[]) => {
      const payload = {
        saleData: {
          empleado_id: this.empleado!.id,
          usuario_id: user_id,
          total_venta: this.netTotal,
          subsidio_aplicado: this.subsidioTotal,
          tipo_venta: "pdv",
          monedero_id: this.empleado!.monedero!.id,
          // En este flujo, use el método de pago seleccionado (que ahora debe contener la info de monedero)
          metodo_pago_id: this.selectedMetodoPago ? this.selectedMetodoPago.id : null

        },
        details: details
      };

      console.log("Payload enviado:", payload);
      this.transaccionesService.procesarTransaccion(payload).subscribe({
        next: (response: any) => {
          console.log('Transacción procesada:', response);
          this.cart = [];
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
    this.metodosPagoService.listarMetodosPago().subscribe({
      next: (response) => {
        this.metodosPago = response;
        this.showPaymentMethodModal = true;
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

    // Recupera el usuario logueado
    const user_idStr = localStorage.getItem('user_id');
    const user_id = user_idStr ? Number(user_idStr) : 0;
    if (!user_id) {
      console.error('No se encontró un usuario logueado válido. user_id:', user_id);
      return;
    }

    // Para este flujo de venta normal, tomamos el total de venta sin subsidio.
    const payload = {
      saleData: {
        empleado_id: 50,             // Valor por defecto para venta normal
        usuario_id: user_id,
        total_venta: this.transactionTotal, // Total a pagar sin descuentos (ya que en venta normal no hay subsidio)
        subsidio_aplicado: 0,
        tipo_venta: "pdv",            // Se mantiene "pdv" por defecto
        monedero_id: 26,             // Valor por defecto para venta normal
        metodo_pago_id: this.selectedMetodoPago.id  // Enviar el ID, no el nombre
      },
      details: this.cart.map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: parseFloat(item.precio_venta.toString()),
        subsidio_aplicado: 0
      }))
    };


    // Enviamos la venta normal al backend
    this.transaccionesService.procesarTransaccion(payload).subscribe({
      next: (response: any) => {
        console.log('Venta normal procesada:', response);
        alert(`Venta registrada con ${this.selectedMetodoPago.nombre}`);
        // Limpiar el carrito y cerrar modales
        this.cart = [];
        this.closeModals();
      },
      error: (err: any) => console.error('Error en venta normal:', err)
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
