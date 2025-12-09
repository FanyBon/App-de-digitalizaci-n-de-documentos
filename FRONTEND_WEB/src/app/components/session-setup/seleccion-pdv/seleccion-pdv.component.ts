// src/app/components/session-setup/seleccion-pdv/seleccion-pdv.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TiposPuntoVentaService } from '../../../services/dispositivos/tipos-punto-venta.service';

interface PuntoVenta {
  id: number;
  codigo: string;
  nombre: string;
  ubicacion_id: number;
  empresa_id: number;
  tipo_id: number;
  activo: boolean;
  // Información del tipo (viene del JOIN en backend)
  tipo_codigo: string;
  tipo_nombre: string;
  tipo_icono?: string;
  tipo_color?: string;
  tipo_categoria?: string;
  tipo_requiere_caja?: boolean;
  tipo_permite_ventas?: boolean;
}

@Component({
  selector: 'app-seleccion-pdv',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './seleccion-pdv.component.html',
  styleUrls: ['./seleccion-pdv.component.css']
})
export class SeleccionPdvComponent implements OnInit {
  pdvs: PuntoVenta[] = [];
  loading: boolean = true;
  error: string = '';
  ubicacionNombre: string = '';
  ubicacionId: number = 0;

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private tiposService: TiposPuntoVentaService
  ) {}

  ngOnInit() {
    // Verificar que tenga ubicación seleccionada
    const ubicacionString = localStorage.getItem('ubicacion_seleccionada');
    if (!ubicacionString) {
      this.router.navigate(['/seleccion-ubicacion']);
      return;
    }

    try {
      const ubicacion = JSON.parse(ubicacionString);
      this.ubicacionNombre = ubicacion.nombre;
      this.ubicacionId = ubicacion.id;
      
      this.cargarPDVs();
    } catch (error) {
      console.error('Error al parsear ubicación:', error);
      this.router.navigate(['/seleccion-ubicacion']);
    }
  }

  /**
   * Carga los PDVs disponibles para la ubicación seleccionada
   */
  cargarPDVs() {
    this.loading = true;
    this.error = '';

    const token = localStorage.getItem('tokencontrolcomidas');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get<{total: number, data: PuntoVenta[]}>(
      `${this.apiUrl}/puntos-venta?ubicacion_id=${this.ubicacionId}&activo=true`,
      { headers }
    ).subscribe({
      next: (response) => {
        this.pdvs = response.data || [];
        this.loading = false;
        console.log('PDVs cargados:', this.pdvs.length, 'puntos de venta');
        
        // Log detallado para debug
        if (this.pdvs.length > 0) {
          console.log('Ejemplo de PDV:', this.pdvs[0]);
        }
      },
      error: (err) => {
        console.error('Error al cargar PDVs:', err);
        this.error = 'No se pudieron cargar los puntos de venta. Intenta nuevamente.';
        this.loading = false;
      }
    });
  }

  /**
   * Selecciona un PDV e inicia la sesión operativa
   */
  seleccionarPDV(pdv: PuntoVenta) {
    const token = localStorage.getItem('tokencontrolcomidas');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const body = {
      ubicacion_id: this.ubicacionId,
      punto_venta_id: pdv.id
    };

    console.log('Iniciando sesión operativa...', body);

    // Llamar al endpoint de iniciar sesión operativa
    this.http.post<any>(
      `${this.apiUrl}/sesiones/iniciar`,
      body,
      { headers }
    ).subscribe({
      next: (response) => {
        console.log('Sesión operativa iniciada:', response);

        // Guardar datos de la sesión
        if (response.data) {
          localStorage.setItem('sesion_id', response.data.id.toString());
          localStorage.setItem('punto_venta_id', pdv.id.toString());
          localStorage.setItem('punto_venta_nombre', pdv.nombre);
          localStorage.setItem('punto_venta_codigo', pdv.codigo);
          localStorage.setItem('punto_venta_tipo_codigo', pdv.tipo_codigo);
          localStorage.setItem('punto_venta_tipo_nombre', pdv.tipo_nombre);
        }

        // Obtener ruta destino según tipo de dispositivo
        const rutaDestino = this.tiposService.getRutaPorTipo(pdv.tipo_codigo);
        
        console.log(`Redirigiendo a ${rutaDestino} (tipo: ${pdv.tipo_codigo})`);
        
        this.router.navigate([rutaDestino]);
      },
      error: (err) => {
        console.error('Error al iniciar sesión operativa:', err);
        const mensaje = err.error?.error || 'Error al iniciar sesión operativa';
        alert(mensaje);
      }
    });
  }

  /**
   * Vuelve a la selección de ubicación
   */
  volverUbicacion() {
    localStorage.removeItem('ubicacion_seleccionada');
    this.router.navigate(['/seleccion-ubicacion']);
  }

  /**
   * Cierra sesión completamente
   */
  cerrarSesion() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      localStorage.clear();
      this.router.navigate(['/login']);
    }
  }

  /**
   * Reintentar carga de PDVs
   */
  reintentar() {
    this.cargarPDVs();
  }

  /**
   * Obtiene el ícono del PDV
   */
  getIconoPDV(pdv: PuntoVenta): string {
    // Si viene el ícono de BD, usarlo
    if (pdv.tipo_icono) {
      return pdv.tipo_icono;
    }
    
    // Si no, usar fallback del servicio
    return this.tiposService.getIconoPorCodigo(pdv.tipo_codigo);
  }

  /**
   * Obtiene el texto descriptivo del tipo
   */
  getTipoTexto(pdv: PuntoVenta): string {
    return pdv.tipo_nombre || 'Dispositivo';
  }

  /**
   * Obtiene las clases de Tailwind para el badge del tipo
   */
  getTipoColorClass(pdv: PuntoVenta): string {
    // Si viene el color de BD, convertirlo a clases Tailwind
    if (pdv.tipo_color) {
      return this.tiposService.getClasesTailwindPorColor(pdv.tipo_color);
    }
    
    // Si no, usar clase por defecto
    return 'bg-gray-100 text-gray-800';
  }
}