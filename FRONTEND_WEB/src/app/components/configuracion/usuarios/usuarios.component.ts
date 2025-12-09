// src/app/components/configuracion/usuarios/usuarios.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListaUsuariosComponent } from './lista-usuarios/lista-usuarios.component';
import { ListaRolesComponent } from './lista-roles/lista-roles.component';
import { ListaPerfilesComponent } from './lista-perfiles/lista-perfiles.component';
import { EstadisticasComponent } from './estadisticas/estadisticas.component';
import { AsignarUbicacionesComponent } from './asignar-ubicaciones/asignar-ubicaciones.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule, 
    ListaUsuariosComponent, 
    ListaRolesComponent,
    ListaPerfilesComponent, 
    EstadisticasComponent,
    AsignarUbicacionesComponent  // ← AGREGADO
  ],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponentt implements OnInit {  // ← MANTIENE DOBLE 'T'
  
  // ============================================
  // TABS
  // ============================================
  tabActiva: 'lista' | 'estadisticas' | 'roles' | 'perfiles' | 'ubicaciones' = 'lista';

  constructor() {}

  ngOnInit(): void {
    console.log('📋 Módulo de Usuarios cargado');
  }

  /**
   * Cambiar de tab
   */
  cambiarTab(tab: 'lista' | 'estadisticas' | 'roles' | 'perfiles' | 'ubicaciones'): void {
    this.tabActiva = tab;
  }

  /**
   * Verificar si una tab está activa
   */
  esTabActiva(tab: string): boolean {
    return this.tabActiva === tab;
  }
}