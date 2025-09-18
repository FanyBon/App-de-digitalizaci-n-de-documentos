import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './ajustes.component.html',
  styleUrls: ['./ajustes.component.css']
})
export class AjustesComponent {
  currentPassword: string = '';
  newPassword: string = '';
  twoFactorEnabled: boolean = false;
  notificationsEnabled: boolean = true;

  updatePassword() {
    console.log('Contraseña actualizada');
  }

  toggleTwoFactorAuth() {
    this.twoFactorEnabled = !this.twoFactorEnabled;
    console.log('Autenticación en dos pasos:', this.twoFactorEnabled ? 'Activada' : 'Desactivada');
  }
}