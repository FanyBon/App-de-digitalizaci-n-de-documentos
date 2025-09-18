// src/app/services/recargas/monederos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SaldoResponse {
  empleado_id: number;
  saldo_actual: string;  // viene como string desde el backend
}

@Injectable({
  providedIn: 'root'
})
export class MonederosService {
  private apiUrl = 'http://localhost:3000/api/monederos'; // Ruta base

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
      // Agrega el token si es necesario
    });
  }

  obtenerMonedero(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Nuevo método para obtener monedero a partir del empleado_id
  obtenerMonederoPorEmpleado(employeeId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${employeeId}`, { headers: this.getHeaders() });
  }

  /** GET /monederos/saldo/:codigo */
  consultaSaldoCodigo(codigo: string): Observable<SaldoResponse> {
    return this.http.get<SaldoResponse>(
      `${this.apiUrl}/saldo/${encodeURIComponent(codigo)}`,
      { headers: this.getHeaders() }
    );
  }

  /** GET /monederos/saldo/qr/:qr */
  consultaSaldoQR(qr: string): Observable<SaldoResponse> {
    return this.http.get<SaldoResponse>(
      `${this.apiUrl}/saldo/qr/${encodeURIComponent(qr)}`,
      { headers: this.getHeaders() }
    );
  }

  // Método para crear un monedero
  crearMonedero(monederoData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, monederoData, { headers: this.getHeaders() });
  }
}
