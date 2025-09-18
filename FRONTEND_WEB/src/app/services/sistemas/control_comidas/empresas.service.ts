import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EmpresasService {
  private apiUrl = 'http://localhost:3000/api/empresas';

  constructor(private http: HttpClient) {}

  listarEmpresas(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  crearEmpresa(empresa: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, empresa);
  }

  editarEmpresa(id: number, empresa: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, empresa);
  }

  eliminarEmpresa(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  getEmpresaById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}
