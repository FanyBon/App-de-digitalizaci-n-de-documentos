import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TransaccionesService {
  private apiUrl = 'http://localhost:3000/api/transacciones';
  private ventasUrl = 'http://localhost:3000/api/ventas'; // para validar nip si está en /api/ventas/validar-nip

  constructor(private http: HttpClient) { }

  private getJwt(): string {
    return localStorage.getItem('tokencontrolcomidas') || '';
  }

  private getHeaders(extra: { [k: string]: string } = {}): HttpHeaders {
    const token = this.getJwt();
    const base: any = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...extra
    };
    console.log("Token enviado en la cabecera:", token);
    return new HttpHeaders(base);
  }

  // Llamada a validar NIP: POST /api/ventas/validar-nip
  validarNip(empleadoId: number, nip: string, monederoId?: number, intentoPor?: string): Observable<any> {
    const body: any = { empleado_id: empleadoId, nip };
    if (monederoId) body.monedero_id = monederoId;
    if (intentoPor) body.intento_por = intentoPor;
    const headers = this.getHeaders();
    return this.http.post(`${this.ventasUrl}/validar-nip`, body, { headers });
  }

  // Crear transacción (contrato esperado POST /api/ventas/transacciones)
  crearTransaccion(payload: any, idempotencyKey: string): Observable<any> {
    const headers = this.getHeaders({ 'X-Idempotency-Key': idempotencyKey });
    return this.http.post(this.apiUrl, payload, { headers, observe: 'response' });
  }

  // Preview venta (opcional, si lo tienes)
  previewVenta(payload: any): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.ventasUrl}/preview`, payload, { headers });
  }
}

export function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
