// src/app/components/header/header.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthControlComidasService } from '../../services/sistemas/control_comidas/auth-control-comidas.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  userName: string = 'Usuario';
  showUserMenu: boolean = false;
  showNotifications: boolean = false;
  notificationCount: number = 1;

  // Modal de confirmación de cierre de sesión
  showLogoutConfirmModal: boolean = false;

  constructor(private router: Router, private authService: AuthControlComidasService) {}

  ngOnInit() {
    // Obtener el nombre de usuario almacenado en el servicio de autenticación
    this.userName = this.authService.getUserName() || 'Usuario';
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
  }

  toggleNotificationsMenu() {
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false;
  }

  goToNotifications() {
    this.router.navigate(['/notificaciones']);
  }

  onUserInfo() {
    this.router.navigate(['/cuenta']);
  }

  onSettings() {
    this.router.navigate(['/ajustes']);
  }

  // Muestra el modal de confirmación de cierre de sesión
  confirmLogout() {
    this.showLogoutConfirmModal = true;
  }

  // Cierra sesión si el usuario confirma
  onLogoutConfirmed(confirm: boolean) {
    if (confirm) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
    this.showLogoutConfirmModal = false;
  }
}
