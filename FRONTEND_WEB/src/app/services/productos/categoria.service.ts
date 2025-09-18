// src/app/modulos/pdv/productos/categoria.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CategoriaArticulo {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: 'pdv' | 'comedor';
  empresa_id: number;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private baseUrl = 'http://localhost:3000/api/categorias_articulos';

  constructor(private http: HttpClient) { }

  listar(): Observable<CategoriaArticulo[]> {
    return this.http.get<CategoriaArticulo[]>(this.baseUrl);
  }

  obtener(id: number): Observable<CategoriaArticulo> {
    return this.http.get<CategoriaArticulo>(`${this.baseUrl}/${id}`);
  }

  crear(payload: Partial<CategoriaArticulo>): Observable<CategoriaArticulo> {
    return this.http.post<CategoriaArticulo>(this.baseUrl, payload);
  }

  editar(id: number, payload: Partial<CategoriaArticulo>): Observable<CategoriaArticulo> {
    return this.http.put<CategoriaArticulo>(`${this.baseUrl}/${id}`, payload);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
