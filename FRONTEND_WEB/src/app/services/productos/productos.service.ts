// src/app/modulos/pdv/productos/productos.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Producto {
  id: number;
  nombre: string;
  codigo_barras: string;
  descripcion: string;
  aplica_subsidio: boolean;
  familia_id: number;
  categoria_id: number;
  tipo_comedor: 'desayuno' | 'comida' | 'cena';
  precio_venta: number;
  costo: number;
  subsidio_id: number;
  articulo_id: number;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductosService {
  // URL base de tu API
  private apiUrl = 'http://localhost:3000/api/productos';

  constructor(private http: HttpClient) {}

  // Alias para unificar con los demás servicios
  listar(): Observable<Producto[]> {
    return this.getProductos();
  }

  // 1) Listar todos los productos
  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.apiUrl);
  }

  // 2) Obtener un producto por ID
  getProducto(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/${id}`);
  }

  // 3) Buscar productos por texto (se asume ?query=texto)
  buscarProducto(texto: string): Observable<Producto[]> {
    const params = new HttpParams().set('query', texto);
    return this.http.get<Producto[]>(`${this.apiUrl}/search`, { params });
  }

  // 4) Crear un nuevo producto
  crearProducto(payload: Partial<Producto>): Observable<Producto> {
    return this.http.post<Producto>(this.apiUrl, payload);
  }

  // 5) Editar un producto existente
  editarProducto(id: number, payload: Partial<Producto>): Observable<Producto> {
    return this.http.put<Producto>(`${this.apiUrl}/${id}`, payload);
  }

  // 6) Eliminar un producto
  eliminarProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
