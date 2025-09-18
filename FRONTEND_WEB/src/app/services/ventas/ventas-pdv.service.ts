// src/app/services/ventas/ventas-pdv.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VentaPDV {
  id: number;
  fecha_hora: string;
  empleado_id: number;
  usuario_id: number;
  total_venta: number;
  subsidio_aplicado: number;
  tipo_venta: string;
  monedero_id: number;
  metodo_pago_id: number;
  created_at: string;
  referencia: string;
}

@Injectable({ providedIn: 'root' })
export class VentasPdvService {
  private baseUrl = 'http://localhost:3000/api/ventas_pdv';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('tokencontrolcomidas') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  listar(): Observable<VentaPDV[]> {
    return this.http.get<VentaPDV[]>(this.baseUrl, {
      headers: this.getHeaders()
    });
  }
}
