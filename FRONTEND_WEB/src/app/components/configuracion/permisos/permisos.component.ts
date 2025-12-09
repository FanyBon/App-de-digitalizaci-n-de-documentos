// src/app/components/configuracion/permisos/permisos.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Subcomponentes
import { ListaPermisosComponent } from './lista-permisos/lista-permisos.component';
import { RolPermisosComponent } from './rol-permisos/rol-permisos.component';
import { ListaModulosComponent } from './lista-modulos/lista-modulos.component';
import { PerfilModulosComponent } from './perfil-modulos/perfil-modulos.component';

@Component({
  selector: 'app-permisos',
  standalone: true,
  imports: [
    CommonModule,
    ListaPermisosComponent,
    RolPermisosComponent,
    ListaModulosComponent,
    PerfilModulosComponent
  ],
  templateUrl: './permisos.component.html',
  styleUrls: ['./permisos.component.css']
})
export class PermisosComponent {
  // Tab activa
  tabActiva: 'permisos' | 'rol-permisos' | 'modulos' | 'perfil-modulos' = 'permisos';

  // Cambiar tab
  cambiarTab(tab: 'permisos' | 'rol-permisos' | 'modulos' | 'perfil-modulos') {
    this.tabActiva = tab;
  }
}