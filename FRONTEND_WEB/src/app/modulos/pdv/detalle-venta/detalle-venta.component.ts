// src/app/modulos/pdv/detalle-venta/detalle-venta.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DetalleVentaService, DetalleVenta as DetDTO } from '../../../services/ventas/detalle-venta.service';
import { VentasPdvService, VentaPDV } from '../../../services/ventas/ventas-pdv.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-detalle-venta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-venta.component.html',
  styleUrls: ['./detalle-venta.component.css']
})
export class DetalleVentaComponent implements OnInit {
  detalles: DetDTO[] = [];
  columnas = [
    'ID', 'Venta', 'Producto', 'Cantidad',
    'Precio unitario', 'Subsidio', 'Método pago', 'Fecha'
  ];

  // Nuevas props para Ventas PDV
  showVentasPDV = false;
  ventasPDV: VentaPDV[] = [];
  showDetalles  = false;
  columnasPDV = [
    'ID', 'Empleado', 'Usuario',
    'Total', 'Subsidio', 'Monedero',
    'Método pago', 'Creado', 'Referencia'
  ];

  constructor(
    private detalleSvc: DetalleVentaService,
    private ventasPdvSvc: VentasPdvService
  ) {}

  ngOnInit(): void {
    this.loadDetalles();
  }

  private loadDetalles(): void {
  this.detalleSvc.listar().pipe(
    map(data =>
      data.map(d => ({
        ...d,
        precio_unitario: parseFloat(String(d.precio_unitario)) || 0,
        subsidio_aplicado: parseFloat(String(d.subsidio_aplicado)) || 0
      })).sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();  // más reciente primero
      })
    )
  ).subscribe({
    next: parsed => this.detalles = parsed,
    error: err => console.error('Error cargando detalles de venta', err)
  });
}

  toggleVentasPDV(): void {
    if (!this.showVentasPDV) {
      this.loadVentasPDV();
    }
    this.showVentasPDV = !this.showVentasPDV;
  }

  toggleDetalles(): void {
    this.showDetalles = !this.showDetalles;
  }

  private loadVentasPDV(): void {
  this.ventasPdvSvc.listar().pipe(
    map(data =>
      data.map(v => ({
        ...v,
        total_venta: parseFloat(String(v.total_venta)) || 0,
        subsidio_aplicado: parseFloat(String(v.subsidio_aplicado)) || 0
      })).sort((a, b) => {
        const fa = new Date(a.created_at);
        const fb = new Date(b.created_at);
        return fb.getTime() - fa.getTime();  // más reciente primero
      })
    )
  ).subscribe({
    next: datos => this.ventasPDV = datos,
    error: err => console.error('Error cargando ventas PDV', err)
  });
} 
}
