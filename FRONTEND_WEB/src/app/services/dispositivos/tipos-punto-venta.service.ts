import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TipoPuntoVenta {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  orden?: number;
  categoria?: 'venta' | 'operacion' | 'servicio' | 'staff';
  requiere_caja?: boolean;
  permite_ventas?: boolean;
  activo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface TiposPuntoVentaResponse {
  total: number;
  data: TipoPuntoVenta[];
}

@Injectable({
  providedIn: 'root'
})
export class TiposPuntoVentaService {
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
   * Obtener todos los tipos de punto de venta
   */
  getTipos(soloActivos: boolean = true): Observable<TiposPuntoVentaResponse> {
    const url = soloActivos 
      ? `${this.apiUrl}/tipos-punto-venta?activo=true`
      : `${this.apiUrl}/tipos-punto-venta`;

    console.log('📤 GET Tipos de Punto de Venta:', url);

    return this.http.get<TiposPuntoVentaResponse>(url, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * Obtener tipo por ID
   */
  getTipoById(id: number): Observable<TipoPuntoVenta> {
    console.log('📤 GET Tipo de Punto de Venta:', id);
    
    return this.http.get<TipoPuntoVenta>(
      `${this.apiUrl}/tipos-punto-venta/${id}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener tipo por código
   */
  getTipoByCodigo(codigo: string): Observable<TipoPuntoVenta> {
    console.log('📤 GET Tipo por código:', codigo);
    
    return this.http.get<TipoPuntoVenta>(
      `${this.apiUrl}/tipos-punto-venta/codigo/${codigo}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Crear nuevo tipo (solo para referencia, normalmente no se usa en frontend)
   */
  createTipo(tipo: Partial<TipoPuntoVenta>): Observable<any> {
    console.log('📤 POST Crear tipo:', tipo);
    
    return this.http.post(`${this.apiUrl}/tipos-punto-venta`, tipo, {
      headers: this.getHeaders()
    });
  }

  /**
   * Actualizar tipo (solo para referencia, normalmente no se usa en frontend)
   */
  updateTipo(id: number, tipo: Partial<TipoPuntoVenta>): Observable<any> {
    console.log('📤 PUT Actualizar tipo:', id, tipo);
    
    return this.http.put(`${this.apiUrl}/tipos-punto-venta/${id}`, tipo, {
      headers: this.getHeaders()
    });
  }

  /**
   * Mapeo de códigos de tipo a rutas del frontend
   */
  readonly RUTAS_POR_CODIGO: Record<string, string> = {
    'pdv': '/pdv/venta',
    'autocobro': '/pdv/venta-automatica',
    'kds': '/comedores/kds',
    'contador': '/comedores/control-comidas',
    'tablet_mesero': '/pdv/tablet-mesero',
    'kiosko': '/pdv/kiosko'
  };

  /**
   * Obtener ruta destino según código de tipo
   */
  getRutaPorTipo(tipoCodigo: string): string {
    return this.RUTAS_POR_CODIGO[tipoCodigo] || '/comedores/control-comidas';
  }

  /**
   * Obtener ícono por defecto si no viene de BD
   */
  getIconoPorCodigo(codigo: string): string {
    const iconos: Record<string, string> = {
      'pdv': 'fa-cash-register',
      'autocobro': 'fa-robot',
      'kds': 'fa-kitchen-set',
      'contador': 'fa-clipboard-check',
      'tablet_mesero': 'fa-tablet-screen-button',
      'kiosko': 'fa-desktop'
    };
    return iconos[codigo] || 'fa-store';
  }

  /**
   * Obtener color por defecto si no viene de BD
   */
  getColorPorCodigo(codigo: string): string {
    const colores: Record<string, string> = {
      'pdv': '#3B82F6',
      'autocobro': '#A855F7',
      'kds': '#F97316',
      'contador': '#10B981',
      'tablet_mesero': '#06B6D4',
      'kiosko': '#6366F1'
    };
    return colores[codigo] || '#6B7280';
  }

  /**
   * Convertir color hex a clases de Tailwind
   */
  getClasesTailwindPorColor(colorHex?: string): string {
    if (!colorHex) return 'bg-gray-100 text-gray-800';

    const mapaColores: Record<string, string> = {
      '#3B82F6': 'bg-blue-100 text-blue-800',
      '#1e40af': 'bg-blue-100 text-blue-800',
      '#A855F7': 'bg-purple-100 text-purple-800',
      '#F97316': 'bg-orange-100 text-orange-800',
      '#10B981': 'bg-green-100 text-green-800',
      '#06B6D4': 'bg-cyan-100 text-cyan-800',
      '#6366F1': 'bg-indigo-100 text-indigo-800'
    };

    return mapaColores[colorHex] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Obtener nombre del tipo por código
   */
  getNombrePorCodigo(codigo: string): string {
    const nombres: Record<string, string> = {
      'pdv': 'Punto de Venta',
      'autocobro': 'Autocobro',
      'kds': 'Kitchen Display',
      'contador': 'Contador de Comidas',
      'tablet_mesero': 'Tablet Mesero',
      'kiosko': 'Kiosko'
    };
    return nombres[codigo] || codigo;
  }
}