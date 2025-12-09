import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductosAutoService {
  private apiUrl = 'http://localhost:3000/api/products'; // base

  constructor(private http: HttpClient) {}

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
    return new HttpHeaders(base);
  }

  // GET /api/products/auto-charge
  listAutoCharge(): Observable<any[]> {
    const headers = this.getHeaders();
    // Llama exactamente a /api/products/auto-charge (tu backend expone esta ruta)
    return this.http.get<any[]>(`${this.apiUrl}/auto-charge`, { headers });
  }
}
