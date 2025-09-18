// src/app/services/recargas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecargasService {
  private apiUrl = 'http://localhost:3000/api/recargas'; // Ruta base

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  listarRecargas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  crearRecarga(recargaData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, recargaData, { headers: this.getHeaders() });
  }
}
