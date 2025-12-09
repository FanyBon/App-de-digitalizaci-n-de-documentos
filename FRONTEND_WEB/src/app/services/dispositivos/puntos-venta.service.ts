import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PuntoVenta {
  id?: number;
  codigo: string;
  nombre: string;
  ubicacion_id: number;
  empresa_id: number;
  tipo_id: number;  // CAMBIADO: de 'tipo' a 'tipo_id'
  activo: boolean;
  creado_por?: number;
  created_at?: Date;
  updated_at?: Date;
  // Datos adicionales del JOIN
  ubicacion_nombre?: string;
  ubicacion_codigo?: string;
  empresa_nombre?: string;
  creado_por_nombre?: string;
  tipo_codigo?: string;
  tipo_nombre?: string;
  tipo_icono?: string;
  tipo_color?: string;
  tipo_categoria?: string;
  tipo_requiere_caja?: boolean;
  tipo_permite_ventas?: boolean;
}

export interface PuntosVentaResponse {
  total: number;
  data: PuntoVenta[];
}

@Injectable({
  providedIn: 'root'
})
export class PuntosVentaService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Obtener headers con token
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('tokencontrolcomidas');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Obtener todos los puntos de venta
   */
  getPuntosVenta(filters?: {
    empresa_id?: number;
    ubicacion_id?: number;
    tipo_id?: number;
    activo?: boolean;
  }): Observable<PuntosVentaResponse> {
    let url = `${this.apiUrl}/puntos-venta`;
    const params: string[] = [];

    if (filters?.empresa_id) {
      params.push(`empresa_id=${filters.empresa_id}`);
    }
    if (filters?.ubicacion_id) {
      params.push(`ubicacion_id=${filters.ubicacion_id}`);
    }
    if (filters?.tipo_id) {
      params.push(`tipo_id=${filters.tipo_id}`);
    }
    if (filters?.activo !== undefined) {
      params.push(`activo=${filters.activo}`);
    }

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    console.log('📤 GET Puntos de Venta:', url);
    
    return this.http.get<PuntosVentaResponse>(url, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * Obtener punto de venta por ID
   */
  getPuntoVentaById(id: number): Observable<PuntoVenta> {
    console.log('📤 GET Punto de Venta:', id);
    
    return this.http.get<PuntoVenta>(`${this.apiUrl}/puntos-venta/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Obtener por código
   */
  getPuntoVentaByCodigo(codigo: string): Observable<PuntoVenta> {
    console.log('📤 GET Punto de Venta por código:', codigo);
    
    return this.http.get<PuntoVenta>(`${this.apiUrl}/puntos-venta/codigo/${codigo}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Crear nuevo punto de venta
   */
  createPuntoVenta(puntoVenta: Partial<PuntoVenta>): Observable<any> {
    console.log('📤 POST Crear punto de venta:', puntoVenta);
    
    return this.http.post(`${this.apiUrl}/puntos-venta`, puntoVenta, {
      headers: this.getHeaders()
    });
  }

  /**
   * Actualizar punto de venta
   */
  updatePuntoVenta(id: number, puntoVenta: Partial<PuntoVenta>): Observable<any> {
    console.log('📤 PUT Actualizar punto de venta:', id, puntoVenta);
    
    return this.http.put(`${this.apiUrl}/puntos-venta/${id}`, puntoVenta, {
      headers: this.getHeaders()
    });
  }

  /**
   * Desactivar punto de venta (soft delete)
   */
  desactivarPuntoVenta(id: number): Observable<any> {
    console.log('📤 DELETE Desactivar punto de venta:', id);
    
    return this.http.delete(`${this.apiUrl}/puntos-venta/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Reactivar punto de venta
   */
  reactivarPuntoVenta(id: number): Observable<any> {
    console.log('📤 PATCH Reactivar punto de venta:', id);
    
    return this.http.patch(`${this.apiUrl}/puntos-venta/${id}/reactivate`, {}, {
      headers: this.getHeaders()
    });
  }

  /**
   * Eliminar permanentemente
   */
  eliminarPermanente(id: number): Observable<any> {
    console.log('📤 DELETE PERMANENTE punto de venta:', id);
    
    return this.http.delete(`${this.apiUrl}/puntos-venta/${id}/permanent`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Obtener historial de auditoría
   */
  getHistorial(id: number): Observable<any> {
    console.log('📤 GET Historial punto de venta:', id);
    
    return this.http.get(`${this.apiUrl}/puntos-venta/${id}/historial`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Obtener ícono según tipo
   */
  getIconoPDV(tipoCodigo: string): string {
    const iconos: Record<string, string> = {
      'pdv': 'fa-cash-register',
      'autocobro': 'fa-robot',
      'kds': 'fa-kitchen-set',
      'contador': 'fa-clipboard-check',
      'tablet_mesero': 'fa-tablet-screen-button',
      'kiosko': 'fa-desktop'
    };
    return iconos[tipoCodigo] || 'fa-store';
  }

  /**
   * Obtener texto descriptivo del tipo
   */
  getTipoTexto(tipoCodigo: string): string {
    const tipos: Record<string, string> = {
      'pdv': 'Punto de Venta',
      'autocobro': 'Autocobro',
      'kds': 'Kitchen Display',
      'contador': 'Contador',
      'tablet_mesero': 'Tablet Mesero',
      'kiosko': 'Kiosko'
    };
    return tipos[tipoCodigo] || tipoCodigo;
  }
}