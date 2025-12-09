import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListaEmpresasComponent } from './lista-empresas/lista-empresas.component';
import { ListaUbicacionesComponent } from './lista-ubicaciones/lista-ubicaciones.component';

@Component({
  selector: 'app-ubicaciones',
  standalone: true,
  imports: [
    CommonModule,
    ListaEmpresasComponent,
    ListaUbicacionesComponent
  ],
  templateUrl: './ubicaciones.component.html',
  styleUrls: ['./ubicaciones.component.css']
})
export class UbicacionesComponent implements OnInit {
  
  /**
   * Tab actualmente visible
   * - 'empresas': Muestra el CRUD de empresas
   * - 'ubicaciones': Muestra el CRUD de ubicaciones
   */
  tabActiva: 'empresas' | 'ubicaciones' = 'empresas';

  ngOnInit() {
    console.log('🏢 Módulo de Empresas y Ubicaciones iniciado');
    console.log('🔹 Tab inicial:', this.tabActiva);
  }

  /**
   * Cambiar la tab activa
   */
  cambiarTab(tab: 'empresas' | 'ubicaciones') {
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
  isTabActiva(tab: 'empresas' | 'ubicaciones'): boolean {
    return this.tabActiva === tab;
  }
}