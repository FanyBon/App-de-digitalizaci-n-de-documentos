import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';  // ⭐ AGREGAR ESTE IMPORT

export interface Empresa {
  id: number;
  parent_id?: number | null;  // ⭐ ASEGÚRATE QUE ESTÉ
  nombre: string;
  contacto: string;
  telefono: string;
  costo_charola?: number;
  estimado_personas?: number;
  estatus: 'activo' | 'inactivo' | 'suspendido';
  created_at?: string;
  updated_at?: string;
  sincronizado?: boolean;
  
  // Campos calculados del backend
  total_ubicaciones?: number;
  total_puntos_venta?: number;
  parent_nombre?: string;  // ⭐ ASEGÚRATE QUE ESTÉ (viene como parent_nombre del backend)
}

export interface EmpresaResponse {
  total: number;
  data: Empresa[];
}

export interface EmpresaDetalle extends Empresa {
  stats?: {
    total_ubicaciones: number;
    ubicaciones_activas: number;
    total_puntos_venta: number;
    puntos_venta_activos: number;
    total_usuarios: number;
    sesiones_activas: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EmpresasService {
  private apiUrl = 'http://localhost:3000/api/empresas';

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
   * Listar todas las empresas
   * @param estatus - Filtro opcional por estatus
   * ⭐ CAMBIO: Ahora retorna Empresa[] en lugar de EmpresaResponse
   */
  listarEmpresas(estatus?: 'activo' | 'inactivo' | 'suspendido'): Observable<Empresa[]> {
    console.log('📤 GET Empresas', estatus ? `(estatus=${estatus})` : '');
    
    let url = this.apiUrl;
    if (estatus) {
      url += `?estatus=${estatus}`;
    }
    
    return this.http.get<EmpresaResponse>(url, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data)  // ⭐ EXTRAER SOLO .data
    );
  }

  /**
   * Listar empresas con respuesta completa (incluye total)
   * Útil cuando necesitas el count total
   */
  listarEmpresasCompleto(estatus?: 'activo' | 'inactivo' | 'suspendido'): Observable<EmpresaResponse> {
    console.log('📤 GET Empresas Completo', estatus ? `(estatus=${estatus})` : '');
    
    let url = this.apiUrl;
    if (estatus) {
      url += `?estatus=${estatus}`;
    }
    
    return this.http.get<EmpresaResponse>(url, {
      headers: this.getHeaders()
    });
  }

  /**
   * Obtener empresa por ID con estadísticas
   */
  getEmpresaById(id: number): Observable<EmpresaDetalle> {
    console.log('📤 GET Empresa:', id);
    
    return this.http.get<EmpresaDetalle>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Crear empresa
   */
  crearEmpresa(empresa: Partial<Empresa>): Observable<{ mensaje: string; data: Empresa }> {
    console.log('📤 POST Crear Empresa:', empresa);
    
    return this.http.post<{ mensaje: string; data: Empresa }>(
      this.apiUrl, 
      empresa, 
      { headers: this.getHeaders() }
    );
  }

  /**
   * Editar empresa
   */
  editarEmpresa(id: number, empresa: Partial<Empresa>): Observable<{ mensaje: string; data: Empresa }> {
    console.log('📤 PUT Editar Empresa:', id, empresa);
    
    return this.http.put<{ mensaje: string; data: Empresa }>(
      `${this.apiUrl}/${id}`, 
      empresa, 
      { headers: this.getHeaders() }
    );
  }

  /**
   * Cambiar estatus (activar/inactivar/suspender)
   */
  cambiarEstatus(
    id: number, 
    estatus: 'activo' | 'inactivo' | 'suspendido'
  ): Observable<{ mensaje: string; data: Empresa }> {
    console.log('📤 PATCH Cambiar Estatus:', id, estatus);
    
    return this.http.patch<{ mensaje: string; data: Empresa }>(
      `${this.apiUrl}/${id}/status`, 
      { estatus }, 
      { headers: this.getHeaders() }
    );
  }

  /**
   * Eliminar empresa permanentemente
   */
  eliminarEmpresa(id: number): Observable<{ mensaje: string }> {
    console.log('📤 DELETE Eliminar Empresa:', id);
    
    return this.http.delete<{ mensaje: string }>(
      `${this.apiUrl}/${id}`, 
      { headers: this.getHeaders() }
    );
  }

  /**
   * Obtener historial de auditoría
   */
  getHistorial(id: number): Observable<any> {
    console.log('📤 GET Historial Empresa:', id);
    
    return this.http.get<any>(
      `${this.apiUrl}/${id}/historial`, 
      { headers: this.getHeaders() }
    );
  }
}