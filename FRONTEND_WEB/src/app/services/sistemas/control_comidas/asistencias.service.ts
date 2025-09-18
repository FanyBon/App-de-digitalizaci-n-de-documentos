import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AsistenciasService {
  private apiUrl = 'http://localhost:3000/api/asistencias';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
      // + token si aplica…
    });
  }

  listarAsistencias(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  /** Nuevo: listar asistencias por rango y empresa */
  listarAsistenciasPorRango(
    empresaId: number,
    start: string,
    end: string
  ): Observable<any[]> {
    let params = new HttpParams()
      .set('empresa_id', empresaId.toString())
      .set('start', start)
      .set('end', end);

    return this.http.get<any[]>(
      `${this.apiUrl}/rango`,
      { headers: this.getHeaders(), params }
    );
  }

  crearAsistencia(asistencia: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, asistencia, { headers: this.getHeaders() });
  }

  editarAsistencia(id: number, asistencia: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, asistencia, { headers: this.getHeaders() });
  }

  eliminarAsistencia(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
