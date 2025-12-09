// src/app/components/sidebar/sidebar.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthControlComidasService } from '../../services/sistemas/control_comidas/auth-control-comidas.service';
import { ModulosUsuarioService, ModuloPermitido, ModuloHijo } from '../../services/usuarios_plataforma/modulos-usuario.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  // ============================================
  // CONTROL DE UI
  // ============================================
  openSubmenu: { [key: string]: boolean } = {};
  isSidebarExpanded: boolean = true;
  showLogoutModal: boolean = false;
  
  // ============================================
  // AUTENTICACIÓN
  // ============================================
  isAuthenticated: boolean = false;

  // ============================================
  // ⭐ MÓDULOS PERMITIDOS (DINÁMICO)
  // ============================================
  modulosPermitidos: ModuloPermitido[] = [];

  constructor(
    private authService: AuthControlComidasService,
    private modulosUsuarioService: ModulosUsuarioService,
    private router: Router
  ) {}

  ngOnInit() {
    // Verificar autenticación
    const token = localStorage.getItem('tokencontrolcomidas');
    this.isAuthenticated = !!token;

    // ⭐ Cargar módulos permitidos del usuario
    this.cargarModulosPermitidos();
    
    // Debug: mostrar módulos cargados
    console.log('🔐 Módulos permitidos:', this.modulosPermitidos);
  }

  // ============================================
  // ⭐ CARGAR MÓDULOS PERMITIDOS
  // ============================================
  cargarModulosPermitidos(): void {
    this.modulosPermitidos = this.modulosUsuarioService.getModulosPermitidos();
    console.log('📋 Módulos cargados en sidebar:', this.modulosPermitidos.length);
    
    // Debug: imprimir estructura
    this.modulosPermitidos.forEach(m => {
      console.log(`  📁 ${m.nombre} (${m.codigo})`);
      m.hijos.forEach(h => {
        console.log(`     └─ ${h.nombre} → ${h.ruta}`);
      });
    });
  }

  // ============================================
  // ⭐ VERIFICAR SI TIENE ACCESO A UN MÓDULO PADRE
  // ============================================
  tieneAccesoModulo(codigo: string): boolean {
    const tiene = this.modulosPermitidos.some(m => m.codigo === codigo);
    return tiene;
  }

  // ============================================
  // ⭐ OBTENER MÓDULO PADRE POR CÓDIGO
  // ============================================
  getModulo(codigo: string): ModuloPermitido | undefined {
    return this.modulosPermitidos.find(m => m.codigo === codigo);
  }

  // ============================================
  // ⭐ OBTENER HIJOS DE UN MÓDULO
  // ============================================
  getHijos(codigo: string): ModuloHijo[] {
    const modulo = this.getModulo(codigo);
    return modulo ? modulo.hijos : [];
  }

  // ============================================
  // ⭐ VERIFICAR SI TIENE HIJOS VISIBLES
  // ============================================
  tieneHijosVisibles(codigo: string): boolean {
    return this.getHijos(codigo).length > 0;
  }

  // ============================================
  // TOGGLE SUBMENU
  // ============================================
  toggleSubmenu(menu: string): void {
    this.openSubmenu[menu] = !this.openSubmenu[menu];
  }

  isSubmenuOpen(menu: string): boolean {
    return this.openSubmenu[menu] || false;
  }

  // ============================================
  // TOGGLE SIDEBAR
  // ============================================
  toggleSidebar(): void {
    this.isSidebarExpanded = !this.isSidebarExpanded;
  }

  // ============================================
  // MODAL LOGOUT
  // ============================================
  abrirModalLogout(): void {
    this.showLogoutModal = true;
  }

  cancelarLogout(): void {
    this.showLogoutModal = false;
  }

  // ============================================
  // LOGOUT
  // ============================================
  confirmLogout(): void {
    const confirmation = confirm('¿Estás seguro de que deseas cerrar sesión?');
    if (confirmation) {
      this.logout();
    }
  }

  confirmarLogoutcontrolcoidas(): void {
    this.authService.logout();
    this.isAuthenticated = false;
    this.showLogoutModal = false;
  }

  private logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}