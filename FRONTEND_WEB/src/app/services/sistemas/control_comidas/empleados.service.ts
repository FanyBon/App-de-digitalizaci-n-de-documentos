import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmpleadosService {
  private apiUrl = 'http://localhost:3000/api/empleados';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
      // Agrega el token en caso de ser necesario, por ejemplo:
      // Authorization: `Bearer ${localStorage.getItem('tokencontrolcomidas') || ''}`
    });
  }

  listarEmpleados(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  crearEmpleado(empleado: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, empleado, { headers: this.getHeaders() });
  }

  editarEmpleado(id: number, empleado: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, empleado, { headers: this.getHeaders() });
  }

  eliminarEmpleado(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
  
  // Nuevo método para buscar empleados en el backend
  buscarEmpleados(query: string): Observable<any[]> {
    const url = `${this.apiUrl}/search?q=${encodeURIComponent(query)}`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }
}
