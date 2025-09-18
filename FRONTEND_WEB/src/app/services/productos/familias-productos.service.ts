// src/app/modulos/pdv/productos/familias-productos.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FamiliaProducto {
  id: number;
  nombre: string;
  descripcion: string;
  parent_id: number | null;
  empresa_id: number;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class FamiliaProductoService {
  private apiUrl  = 'http://localhost:3000/api';
  private endpoint = `${this.apiUrl}/familias_productos`;

  constructor(private http: HttpClient) {}

  // 1) Método original que usas en otros módulos
  getFamiliasProductos(): Observable<FamiliaProducto[]> {
    return this.http.get<FamiliaProducto[]>(this.endpoint);
  }

  // 2) Alias para compatibilidad con listar()
  listar(): Observable<FamiliaProducto[]> {
    return this.getFamiliasProductos();
  }

  // 3) Resto del CRUD
  getFamiliaProducto(id: number): Observable<FamiliaProducto> {
    return this.http.get<FamiliaProducto>(`${this.endpoint}/${id}`);
  }

  crearFamiliaProducto(
    payload: Partial<FamiliaProducto>
  ): Observable<FamiliaProducto> {
    return this.http.post<FamiliaProducto>(this.endpoint, payload);
  }

  editarFamiliaProducto(
    id: number,
    payload: Partial<FamiliaProducto>
  ): Observable<FamiliaProducto> {
    return this.http.put<FamiliaProducto>(
      `${this.endpoint}/${id}`,
      payload
    );
  }

  eliminarFamiliaProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
