import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListaDispositivosComponent } from './lista-dispositivos/lista-dispositivos.component';
import { TiposDispositivosComponent } from './tipos-dispositivos/tipos-dispositivos.component';

@Component({
  selector: 'app-dispositivos',
  standalone: true,
  imports: [
    CommonModule,
    ListaDispositivosComponent,
    TiposDispositivosComponent
  ],
  templateUrl: './dispositivos.component.html',
  styleUrls: ['./dispositivos.component.css']
})
export class DispositivosComponent implements OnInit {
  
  // ========================================
  // ESTADO DE TABS
  // ========================================
  
  /**
   * Tab actualmente visible
   * - 'dispositivos': Muestra el CRUD de dispositivos
   * - 'tipos': Muestra el CRUD de tipos de dispositivos
   */
  tabActiva: 'dispositivos' | 'tipos' = 'dispositivos';

  // ========================================
  // LIFECYCLE HOOKS
  // ========================================

  ngOnInit() {
    console.log('📱 Módulo de Dispositivos iniciado');
    console.log('🔹 Tab inicial:', this.tabActiva);
  }

  // ========================================
  // MÉTODOS DE NAVEGACIÓN
  // ========================================

  /**
   * Cambiar la tab activa
   * @param tab - Identificador de la tab a mostrar
   */
  cambiarTab(tab: 'dispositivos' | 'tipos') {
    if (this.tabActiva === tab) {
      // Si ya está en la misma tab, no hacer nada
      return;
    }

    this.tabActiva = tab;
    console.log('🔄 Tab cambiada a:', tab);

    // Opcional: Scroll al inicio cuando cambias de tab
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Verificar si una tab está activa
   * @param tab - Identificador de la tab
   * @returns true si la tab está activa
   */
  isTabActiva(tab: 'dispositivos' | 'tipos'): boolean {
    return this.tabActiva === tab;
  }
}