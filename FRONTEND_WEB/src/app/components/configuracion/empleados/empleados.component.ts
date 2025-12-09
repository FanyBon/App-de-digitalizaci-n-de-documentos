// src/app/modulos/procomin/comedores/empleados/empleados.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListaEmpleadosComponent } from './lista-empleados/lista-empleados.component';
import { EstadisticasEmpleadosComponent } from './estadisticas-empleados/estadisticas-empleados.component';

@Component({
  selector: 'app-empleados-configuracion',  // ← CAMBIO: selector único
  standalone: true,
  imports: [
    CommonModule,
    ListaEmpleadosComponent,
    EstadisticasEmpleadosComponent
  ],
  templateUrl: './empleados.component.html',
  styleUrls: ['./empleados.component.css']
})
export class EmpleadosComponent implements OnInit {
  
  /**
   * Tab actualmente visible
   * - 'lista': Muestra el CRUD de empleados
   * - 'estadisticas': Muestra el dashboard de estadísticas
   */
  tabActiva: 'lista' | 'estadisticas' = 'lista';

  ngOnInit() {
    console.log('👥 Módulo de Empleados iniciado');
    console.log('🔹 Tab inicial:', this.tabActiva);
  }

  /**
   * Cambiar la tab activa
   */
  cambiarTab(tab: 'lista' | 'estadisticas') {
    if (this.tabActiva === tab) {
      return;
    }

    this.tabActiva = tab;
    console.log('🔄 Tab cambiada a:', tab);
    
    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Verificar si una tab está activa
   */
  isTabActiva(tab: 'lista' | 'estadisticas'): boolean {
    return this.tabActiva === tab;
  }
}