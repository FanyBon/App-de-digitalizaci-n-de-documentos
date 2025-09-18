import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TransaccionesService {
  private apiUrl = 'http://localhost:3000/api/transacciones';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('tokencontrolcomidas') || '';
    console.log("Token enviado en la cabecera:", token);
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  procesarTransaccion(payload: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload, { headers: this.getHeaders() });
  }
}
