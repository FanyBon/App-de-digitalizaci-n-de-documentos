import { Component, OnInit, OnDestroy,AfterViewInit,ViewChild,ElementRef, viewChild } from '@angular/core';
import { EmpresasService } from '../../../../services/sistemas/control_comidas/empresas.service';
import { EmpleadosService } from '../../../../services/sistemas/control_comidas/empleados.service';
import { AsistenciasService } from '../../../../services/sistemas/control_comidas/asistencias.service';
import { AuthControlComidasService } from '../../../../services/sistemas/control_comidas/auth-control-comidas.service';
import { Html5Qrcode } from 'html5-qrcode';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-control-comidas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './control-comidas.component.html',
  styleUrls: ['./control-comidas.component.css']
})
export class ControlComidasComponent implements OnInit, AfterViewInit {
  @ViewChild('barcodeInputRef', { static: false })
  barcodeInputRef?: ElementRef<HTMLInputElement>;
  // Listados obtenidos de los servicios
  companies: any[] = [];
  employees: any[] = [];
  filteredEmployees: any[] = [];
  todayAssistances: any[] = [];
  totalAsistenciasHoy: number = 0;
  showQrModal = false;
  private qrScanner?: Html5Qrcode;

  // Variables para la selección de empresa (modal)
  showModal: boolean = true;
  selectedCompanyId: number | null = null;
  selectedCompanyName: string = '';

  // Para búsqueda por código de barras
  barcodeInput: string = '';

  // Variables para el modal de confirmación de asistencia
  showConfirmModal: boolean = false;
  confirmAsistenciaData: any = {};
  showValidation = false;
  validationMessage = '';
  showUserNotFoundModal = false;

  role!: string;
  userCompanyIds: number[] = [];
  

  constructor(
    private authSvc: AuthControlComidasService,
    private empresasService: EmpresasService,
    private empleadosService: EmpleadosService,
    private asistenciasService: AsistenciasService
  ) { }

  ngOnInit(): void {
    // Re-enfocar al regresar de otra pestaña
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.focusBarcodeInput();
    });

    // 1) Leer rol y empresas del usuario
    const user = this.authSvc.getUser();
    this.role           = user.role   ?? '';
    this.userCompanyIds = user.empresas;

    // 2) Cargar empresas y empleados en paralelo
    forkJoin({
      companies: this.empresasService.listarEmpresas(),
      employees: this.empleadosService.listarEmpleados()
    }).subscribe({
      next: ({ companies, employees }) => {
        this.employees = employees;

        // 3) Filtrar según rol
        this.companies = this.role === 'supAdministrador'
          ? companies
          : companies.filter(c => this.userCompanyIds.includes(c.id));

        // 4) Mostrar modal si hace falta o auto-seleccionar
        if (this.role === 'supAdministrador' || this.companies.length > 1) {
          this.showModal = true;
        } else if (this.companies.length === 1) {
          this.selectedCompanyId = this.companies[0].id;
          this.onAcceptCompany();
        } else {
          console.error('No tienes empresas asignadas');
        }
      },
      error: err => console.error('Error al inicializar datos:', err)
    });
  }

  ngAfterViewInit(): void {
    // Al cargar el componente: enfocar + reforzar foco 2s
    this.focusBarcodeInput();
    const interval = setInterval(() => this.focusBarcodeInput(), 500);
    setTimeout(() => clearInterval(interval), 2000);
  }


  // Cargar la lista de empresas
  loadCompanies(): void {
    this.empresasService.listarEmpresas().subscribe({
      next: (data) => {
        this.companies = data;
      },
      error: (err) => {
        console.error('Error al cargar empresas:', err);
      }
    });
  }

  // Cargar la lista de todos los empleados
  loadEmployees(): void {
    this.empleadosService.listarEmpleados().subscribe({
      next: (data) => {
        this.employees = data;
      },
      error: (err) => {
        console.error('Error al cargar empleados:', err);
      }
    });
  }

  // Cargar las asistencias del día actual (últimos 50) para la empresa seleccionada
  loadTodayAssistances(): void {
    this.asistenciasService.listarAsistencias().subscribe({
      next: (data) => {
        const today = new Date();

        // 1. Filtrar solo asistencias de hoy y de la empresa seleccionada
        const filtered = data
          .filter((a: any) => {
            const d = new Date(a.fecha);
            return (
              d.getFullYear() === today.getFullYear() &&
              d.getMonth() === today.getMonth() &&
              d.getDate() === today.getDate() &&
              a.empresa_id === this.selectedCompanyId
            );
          })
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        // 2. Enriquecer con nombre de empleado y nombre de empresa
        this.todayAssistances = filtered.map((asistencia: any) => {
          const empleado = this.employees.find(e => e.id === asistencia.empleado_id);
          const empresa = this.companies.find(c => c.id === asistencia.empresa_id);

          return {
            ...asistencia,
            empleado_nombre: empleado ? empleado.nombre : '—',
            empleado_cedula: empleado ? empleado.cedula : '—',
            empresa_nombre: empresa ? empresa.nombre : '—'
          };
        });

        // 3. Actualizar el contador de asistencias de hoy
        this.totalAsistenciasHoy = this.todayAssistances.length;
      },
      error: (err) => {
        console.error('Error al cargar asistencias:', err);
      }
    });
  }



  // Al aceptar la empresa en el modal
  onAcceptCompany(): void {
    const selected = this.companies.find(company => company.id === this.selectedCompanyId);
    if (selected) {
      this.selectedCompanyName = selected.nombre;
      this.filteredEmployees = this.employees.filter(emp => emp.empresa_id === this.selectedCompanyId);
      this.loadTodayAssistances();
    } else {
      this.selectedCompanyName = 'Empresa no encontrada';
      this.filteredEmployees = [];
      this.todayAssistances = [];
    }
    this.showModal = false;
  }

  // Helper para formatear la fecha como "YYYY-MM-DD HH:mm:ss"
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    const seconds = ('0' + date.getSeconds()).slice(-2);
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // Helper para determinar el horario basado en la hora actual
  private getHorario(date: Date): string {
    const hour = date.getHours();
    if (hour >= 7 && hour < 12) {
      return 'desayuno';
    } else if (hour >= 12 && hour < 19) {
      return 'almuerzo';
    } else {
      return 'cena';
    }
  }

  // Buscar un empleado por su código de barras y preparar el modal
  

  searchEmployeeByBarcode(): void {
    const value = this.barcodeInput.trim();
    if (!value) return;

     const code = this.barcodeInput.trim();
    if (!code) {
      this.showUserNotFoundModal = true;
      return;
    }

    const found = this.filteredEmployees.find(e => e.codigo_barras === code);
    if (!found) {
      // en vez de alert(), abrimos el modal
      this.showUserNotFoundModal = true;
      this.barcodeInput = '';
      return;
    }

    const now = new Date();
    const asistencia = {
      empleado_id: found.id,
      fecha: this.formatDate(now),
      horario: this.getHorario(now),
      metodo: 'barras',
      empresa_id: this.selectedCompanyId
    };

    this.confirmAsistenciaData = {
      ...asistencia,
      empleado: found
    };
    this.showConfirmModal = true;

    this.barcodeInput = '';
    this.focusBarcodeInput(); // volver a poner el cursor
  }

  // Cierra el modal “Usuario no encontrado”
  public closeUserNotFoundModal(): void {
    this.showUserNotFoundModal = false;
    this.focusBarcodeInput();
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.focusBarcodeInput();
  }

  // Este método lo colocas abajo del todo, en la misma clase
  public focusBarcodeInput(): void {
    // 2) Protege el acceso con ?.
    setTimeout(() => {
      this.barcodeInputRef?.nativeElement.focus();
      this.barcodeInputRef?.nativeElement.select();
    }, 0);
  }

  handleBlur(): void {
  setTimeout(() => this.focusBarcodeInput(), 100);
}

  // Cuando se presiona "Aceptar" en el modal de confirmación
  confirmAssistance(): void {
    this.asistenciasService.crearAsistencia(this.confirmAsistenciaData)
      .subscribe({
        next: () => {
          this.showConfirmModal = false;
          this.loadTodayAssistances();
          this.barcodeInput = '';
        },
        error: err => {
          if (err.status === 409 && err.error?.code === 'MAX_ASISTENCIAS_EXCEDIDAS') {
            this.validationMessage = err.error.message;
            this.showValidation = true;
          } else {
            console.error('Error al registrar asistencia:', err);
            alert('Error al registrar asistencia. Inténtalo de nuevo.');
          }
        }
      });
  }


  // Cancelar la operación en el modal de confirmación
  cancelAssistance(): void {
    this.showConfirmModal = false;
  }



  openQrScanner(): void {
    this.showQrModal = true;

    // Espera que el div #qr-reader exista
    setTimeout(() => {
      if (!this.qrScanner) {
        this.qrScanner = new Html5Qrcode('qr-reader');
        this.qrScanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          qrCodeMessage => this.handleQrScan(qrCodeMessage),
          _error => { /* ignoramos fallos momentáneos */ }
        ).catch(err => console.error('Error iniciando QR scanner:', err));
      }
    }, 100);
  }

  /** Lógica al leer un mensaje QR */
  private handleQrScan(qrCodeMessage: string): void {
    // Busca en los empleados filtrados por empresa
    const found = this.filteredEmployees.find(emp =>
      emp.codigo_qr?.trim() === qrCodeMessage.trim()
    );

    // Validaciones idénticas a las de barras
    if (!found) {
      alert('Empleado no encontrado con ese código QR en la empresa seleccionada.');
      return this.closeQrScanner();
    }

    // Prepara el objeto de asistencia
    const now = new Date();
    const asistenciaData = {
      empleado_id: found.id,
      fecha: this.formatDate(now),
      horario: this.getHorario(now),
      metodo: 'qr',
      empresa_id: this.selectedCompanyId
    };

    // Monta el modal de confirmación
    this.confirmAsistenciaData = { ...asistenciaData, empleado: found };
    this.closeQrScanner();
    this.showConfirmModal = true;
  }

  /** Cierra el modal y detiene la cámara */
  closeQrScanner(): void {
    this.showQrModal = false;
    if (!this.qrScanner) return;

    this.qrScanner.stop()
      .then(() => this.qrScanner!.clear())
      .catch(err => console.error('Error deteniendo QR scanner:', err))
      .finally(() => this.qrScanner = undefined);
  }

  ngOnDestroy(): void {
    // Si la cámara sigue abierta, límpiala
    if (this.qrScanner) {
      try {
        this.qrScanner.clear();
      } catch { /* nada más */ }
    }
  }



  exportarHoyACSV(): void {
  this.asistenciasService.listarAsistencias().subscribe({
    next: (data: any[]) => {
      const today = new Date();
      const todasHoy = data
        .filter(a => {
          const d = new Date(a.fecha);
          return (
            d.getFullYear() === today.getFullYear() &&
            d.getMonth()    === today.getMonth() &&
            d.getDate()     === today.getDate() &&
            a.empresa_id   === this.selectedCompanyId
          );
        })
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      // 1) Enriquecemos y declaramos como Record<string, any>[]
      const filas: Record<string, any>[] = todasHoy.map(a => {
        const emp = this.employees.find(e => e.id === a.empleado_id)!;
        const comp = this.companies .find(c => c.id === a.empresa_id)!;
        return {
          ID:     a.id,
          Empleado: emp.nombre,
          Cedula:   emp.cedula,
          Fecha:    a.fecha,
          Horario:  a.horario,
          Metodo:   a.metodo,
          Empresa:  comp.nombre,
        };
      });

      if (!filas.length) {
        return alert('No hay registros para exportar.');
      }

      // 2) Cabeceras (keys)
      const headers = Object.keys(filas[0]); // ['ID','Empleado','Cedula',…]
      
      // 3) Generar CSV
      const csvLines: string[] = [];
      csvLines.push(headers.join(','));
      for (const row of filas) {
        const line = headers
          .map(h => {
            const cell = row[h] ?? '';
            // Escapar comillas dobles
            const escaped = String(cell).replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',');
        csvLines.push(line);
      }
      const csvContent = csvLines.join('\r\n');

      // 4) Descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      const stamp = today.toISOString().slice(0,10);
      a.download = `asistencias_todas_hoy_${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    error: err => {
      console.error('Error al exportar CSV:', err);
      alert('No se pudo descargar las asistencias.');
    }
  });
}
}