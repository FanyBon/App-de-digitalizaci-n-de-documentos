// src/app/modulos/pdv/clientes/clientes.component.ts
import { Component, OnInit } from '@angular/core';
import { EmpleadosService } from 'src/app/services/sistemas/control_comidas/empleados.service'; // Ajusta la ruta según corresponda
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Necesario para [(ngModel)]
import { RecargasService } from 'src/app/services/recargas/recargas.service';
import { MetodosPagoService } from 'src/app/services/recargas/metodos-pago.service';
import { MonederosService } from 'src/app/services/recargas/monederos.service';
import { EmpresasService } from 'src/app/services/empresas/empresas.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent implements OnInit {
  // Propiedades para clientes, carga y ordenamiento
  clientes: any[] = [];
  loading: boolean = false;
  error: string = '';
  showFullTable: boolean = false;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Propiedades para el modal de búsqueda (botón "Recargar")
  showModal: boolean = false;
  searchQuery: string = '';
  searchResults: any[] = [];

  // Propiedades para el modal de recarga
  showRecargaModal: boolean = false;
  selectedMonederoId: number | null = null;
  montoRecarga: number = 0;
  metodoPagoId: number | null = null;
  metodosPago: any[] = [];

  // Propiedades para el modal de saldo
  showSaldoModal: boolean = false;
  currentMonedero: any = null;

  // Propiedades para el modal de creación de cliente
  showCrearClienteModal: boolean = false;
  newEmpleado: { 
    nombre: string;
    cedula: string;
    empresa_id: number | null;
    codigo_barras: string
  } = {
    nombre: '',
    cedula: '',
    empresa_id: null,
    codigo_barras: ''
  };

  // Empresas
  empresas: any[] = [];

  // Modal de éxito al crear empleado
  mostrarModalSuccess: boolean = false;
  empleadoCreado: any = null;
  monederoCreado: any = null;
  mostrarModalMonedero: boolean = false;

  // --- NUEVA SECCIÓN: FLOJO "AÑADIR TARJETA" ---
  showBuscarEmpleadoParaMonedero: boolean = false;
  searchQueryMonedero: string = '';
  monederoSearchResults: any[] = [];
  selectedEmpleadoForMonedero: any = null;

  constructor(
    private empleadosService: EmpleadosService, 
    private recargasService: RecargasService, 
    private metodosPagoService: MetodosPagoService,
    private monederosService: MonederosService,
    private empresasService: EmpresasService
  ) {}

  ngOnInit(): void {
    this.cargarMetodosPago();
    this.cargarEmpresas();
  }

  cargarEmpresas(): void {
  this.empresasService.listarEmpresas().subscribe({
    next: (data: any) => {
      this.empresas = data;
    },
    error: (err: any) => {
      console.error("Error al cargar las empresas", err);
    }
  });
}

  loadClientes(): void {
    this.loading = true;
    this.error = '';
    this.empleadosService.listarEmpleados().subscribe({
      next: (data: any) => {
        this.clientes = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar los clientes', err);
        this.error = 'Error al cargar los datos';
        this.loading = false;
      }
    });
  }

  toggleTableView(): void {
    this.showFullTable = !this.showFullTable;
  }

  toggleSort(column: string, type: 'number' | 'string' | 'date'): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sortClientes(column, type);
  }

  sortClientes(column: string, type: 'number' | 'string' | 'date'): void {
    this.clientes.sort((a, b) => {
      let aValue = a[column];
      let bValue = b[column];
      
      if (type === 'number') {
        return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      } else if (type === 'string') {
        return this.sortDirection === 'asc'
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      } else if (type === 'date') {
        let aDate = new Date(aValue);
        let bDate = new Date(bValue);
        return this.sortDirection === 'asc'
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }
      return 0;
    });
  }

  // Funciones para el modal de búsqueda (botón "Recargar")
  openModal(): void {
    this.showModal = true;
    this.searchQuery = '';
    this.searchResults = [];
  }

  closeModal(): void {
    this.showModal = false;
  }

  // Usamos el servicio para buscar empleados en el backend
  searchEmpleado(): void {
    if (this.searchQuery.trim() === "") {
      this.searchResults = [];
      return;
    }
    this.empleadosService.buscarEmpleados(this.searchQuery).subscribe({
      next: (data: any) => {
        this.searchResults = data;
      },
      error: (err: any) => {
        console.error('Error al buscar empleados', err);
        this.searchResults = [];
      }
    });
  }
  
  selectMonedero(monederoId: any): void {
    // Abre el modal de recarga con el monedero seleccionado
  this.abrirRecargaModal(monederoId);
  // Cierra el modal de búsqueda si este estaba abierto
  this.closeModal();
  }

  // Funciones para el modal de recarga
  abrirRecargaModal(monederoId: number): void {
    this.selectedMonederoId = monederoId;
    this.showRecargaModal = true;
  }

  cerrarRecargaModal(): void {
    this.showRecargaModal = false;
    this.montoRecarga = 0;
    this.metodoPagoId = null;
  }

  cargarMetodosPago(): void {
    this.metodosPagoService.listarMetodosPago().subscribe({
      next: (data: any) => {
        this.metodosPago = data;
      },
      error: (err: any) => {
        console.error('Error al obtener métodos de pago', err);
      }
    });
  }

  realizarRecarga(): void {
    if (!this.selectedMonederoId || !this.metodoPagoId || this.montoRecarga <= 0) {
      alert('Debes seleccionar un método de pago y establecer un monto válido.');
      return;
    }

    // Obtén el user_id almacenado en localStorage. Te recomiendo que el login almacene este dato.
  const userIdString = localStorage.getItem('user_id');
  if (!userIdString) {
    alert('No se encontró información del usuario logueado. Por favor, vuelve a iniciar sesión.');
    return;
  }
  const userId = Number(userIdString);

  const recargaData = {
    monedero_id: this.selectedMonederoId,
    monto: this.montoRecarga,
    metodo_pago_id: this.metodoPagoId,
    usuario_id: userId
  };

    this.recargasService.crearRecarga(recargaData).subscribe({
      next: (response: any) => {
        alert('Recarga realizada con éxito.');
        this.cerrarRecargaModal();
      },
      error: (err: any) => {
        console.error('Error al realizar la recarga', err);
        alert('Ocurrió un error al realizar la recarga.');
      }
    });
  }

  // Funciones para el modal de saldo
  verSaldo(monederoId: number): void {
    this.monederosService.obtenerMonedero(monederoId).subscribe({
      next: (data: any) => {
        this.currentMonedero = data;
        this.showSaldoModal = true;
      },
      error: (err: any) => {
        console.error("Error al obtener el balance del monedero", err);
        alert("No se pudo obtener la información del monedero");
      }
    });
  }

  cerrarSaldoModal(): void {
    this.showSaldoModal = false;
    this.currentMonedero = null;
  }

  // Funciones para el modal de creación de cliente
  abrirCrearClienteModal(): void {
    // Resetea los valores del nuevo empleado y abre el modal de creación.
    this.newEmpleado = {
      nombre: '',
      cedula: '',
      empresa_id: null,
      codigo_barras: ''
    };
    this.showCrearClienteModal = true;
  }

  cerrarCrearClienteModal(): void {
    this.showCrearClienteModal = false;
  }

  crearEmpleado(): void {
    if (!this.newEmpleado.nombre || !this.newEmpleado.cedula || !this.newEmpleado.empresa_id) {
      alert('Debes ingresar nombre, cédula y seleccionar una empresa.');
      return;
    }

    this.empleadosService.crearEmpleado({ 
      ...this.newEmpleado, 
      activo: true 
    }).subscribe({
      next: (response: any) => {
        // En lugar de alert, mostramos el modal de éxito
        this.empleadoCreado = response.data;
        this.mostrarModalSuccess = true;
        this.cerrarCrearClienteModal();
        this.loadClientes(); // Actualizamos la lista de empleados
      },
      error: (err: any) => {
        console.error('Error al crear empleado', err);
        alert('Ocurrió un error al crear el empleado.');
      }
    });
  }


  // Modal de éxito de creación de empleado
  cerrarModalSuccess(): void {
    this.mostrarModalSuccess = false;
    this.empleadoCreado = null;
  }

  crearTarjeta(): void {
  // Verifica que se haya creado un empleado y que contenga su ID
  if (!this.empleadoCreado || !this.empleadoCreado.id) {
    alert('No se encontró el empleado creado.');
    return;
  }
  
  const monederoData = {
    empleado_id: this.empleadoCreado.id, // Toma el ID del empleado creado
    saldo_actual: 0,                      // O el saldo inicial que requieras
    activo: true                         // Se crea en estado activo
  };
  
  this.monederosService.crearMonedero(monederoData).subscribe({
    next: (response: any) => {
      // Se espera que el backend retorne en response.data la información del monedero creado
      this.monederoCreado = response.data;
      this.mostrarModalMonedero = true;
    },
    error: (err: any) => {
      console.error('Error al crear monedero', err);
      alert('Ocurrió un error al crear el monedero.');
    }
  });
}

  // Función para cerrar el modal de monedero
cerrarModalMonedero(): void {
  this.mostrarModalMonedero = false;
  this.monederoCreado = null;
}

// --- NUEVOS MÉTODOS PARA "AÑADIR TARJETA" ---
  abrirBuscarEmpleadoParaMonedero(): void {
    this.showBuscarEmpleadoParaMonedero = true;
    this.searchQueryMonedero = '';
    this.monederoSearchResults = [];
  }

  cerrarBuscarEmpleadoParaMonedero(): void {
    this.showBuscarEmpleadoParaMonedero = false;
    this.searchQueryMonedero = '';
    this.monederoSearchResults = [];
    this.selectedEmpleadoForMonedero = null;
  }

  buscarEmpleadoParaMonedero(): void {
    if (this.searchQueryMonedero.trim() === "") {
      this.monederoSearchResults = [];
      return;
    }
    // Utilizamos el mismo método del servicio de búsqueda de empleados
    this.empleadosService.buscarEmpleados(this.searchQueryMonedero.trim()).subscribe({
      next: (data: any) => {
        this.monederoSearchResults = data;
      },
      error: (err: any) => {
        console.error('Error al buscar empleados para monedero', err);
        this.monederoSearchResults = [];
      }
    });
  }

  seleccionarEmpleadoParaMonedero(empleado: any): void {
    // Verifica si el empleado ya tiene un monedero
    this.monederosService.obtenerMonederoPorEmpleado(empleado.id).subscribe({
      next: (data: any) => {
        // Si se encuentra, el empleado ya tiene un monedero
        if (data && data.id) {
          alert('El empleado ya cuenta con un monedero.');
          // Cerrar el modal de búsqueda
          this.cerrarBuscarEmpleadoParaMonedero();
        }
      },
      error: (err: any) => {
        if (err.status === 404) {
          // No se encontró monedero, se puede crear
          this.crearMonederoParaEmpleado(empleado);
        } else {
          console.error("Error al verificar monedero", err);
          alert("Error al verificar si el empleado tiene un monedero.");
        }
      }
    });
  }

  crearMonederoParaEmpleado(empleado: any): void {
    const monederoData = {
      empleado_id: empleado.id,
      saldo_actual: 0, // Saldo inicial
      activo: true
    };
    this.monederosService.crearMonedero(monederoData).subscribe({
      next: (response: any) => {
        alert("Monedero creado exitosamente para " + empleado.nombre);
        this.cerrarBuscarEmpleadoParaMonedero();
      },
      error: (err: any) => {
        console.error("Error al crear monedero", err);
        alert("Ocurrió un error al crear el monedero.");
      }
    });
  }

}
