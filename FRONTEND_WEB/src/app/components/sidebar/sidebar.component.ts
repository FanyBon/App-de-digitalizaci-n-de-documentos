import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthControlComidasService } from '../../services/sistemas/control_comidas/auth-control-comidas.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  // Control de menús desplegables
  openSubmenu: { [key: string]: boolean } = {};
  isSidebarExpanded: boolean = false;
  // Variable de autenticación (usando el token específico para Control Comidas)
  isAuthenticated: boolean = false;
  // Variable para controlar la visualización del modal de confirmación de logout
  showLogoutModal: boolean = false;

  constructor(private authService: AuthControlComidasService, private router: Router) {}

  ngOnInit() {
    // Se verifica si existe el token 'tokencontrolcomidas'
    const token = localStorage.getItem('tokencontrolcomidas');
    this.isAuthenticated = !!token;
  }

  toggleSubmenu(menu: string) {
    this.openSubmenu[menu] = !this.openSubmenu[menu];
  }

  isSubmenuOpen(menu: string): boolean {
    return this.openSubmenu[menu] || false;
  }

  toggleSidebar() {
    this.isSidebarExpanded = !this.isSidebarExpanded;
  }

  // Abre el modal de confirmación para cerrar sesión
  abrirModalLogout(): void {
    this.showLogoutModal = true;
  }

  // Muestra confirmación antes de cerrar sesión
  confirmLogout() {
    const confirmation = confirm('¿Estás seguro de que deseas cerrar sesión?');
    if (confirmation) {
      this.logout();
    }
  }

  // Se llama si el usuario confirma el cierre de sesión.
  confirmarLogoutcontrolcoidas(): void {
    localStorage.removeItem('tokencontrolcomidas');
    this.isAuthenticated = false;
    // Cambia la ruta de redirección al login principal
    this.router.navigate(['/login']);
    this.showLogoutModal = false;
  }

  private logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Cancela el cierre de sesión y oculta el modal.
  cancelarLogout(): void {
    this.showLogoutModal = false;
  }
}