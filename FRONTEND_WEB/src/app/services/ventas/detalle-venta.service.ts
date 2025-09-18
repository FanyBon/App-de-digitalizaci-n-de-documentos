// src/app/services/ventas/detalle-venta.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DetalleVenta {
  id: number;
  venta_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subsidio_aplicado: number;
  metodo_pago_id: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class DetalleVentaService {
  // URL base de tu API de detalle de ventas
  private baseUrl = 'http://localhost:3000/api/detalle_venta';

  constructor(private http: HttpClient) {}

  // Genera headers con Content-Type y token de autenticación
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('tokencontrolcomidas') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  /**
   * GET /detalle_venta
   * Lista todos los registros de detalle de venta
   */
  listar(): Observable<DetalleVenta[]> {
    return this.http.get<DetalleVenta[]>(this.baseUrl, {
      headers: this.getHeaders()
    });
  }

  /**
   * GET /detalle_venta/:id
   * Obtiene un detalle de venta por su ID
   */
  obtenerPorId(id: number): Observable<DetalleVenta> {
    return this.http.get<DetalleVenta>(`${this.baseUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }
}
