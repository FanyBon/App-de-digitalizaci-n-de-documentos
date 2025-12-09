// src/app/components/login/login.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthControlComidasService } from '../../services/sistemas/control_comidas/auth-control-comidas.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  showPassword: boolean = false; // Controla la visibilidad de la contraseña

  constructor(
    private authControl: AuthControlComidasService, // Se utiliza el nuevo servicio
    private router: Router
  ) {}

  onSubmit() {
    // Se envía el username como emailOrUsername, según lo espera el backend
    this.authControl.loginControl(this.username, this.password).subscribe({
    next: (response) => {
      if (response.token) {
        console.log('✅ Login exitoso, ubicaciones disponibles:', response.ubicaciones_disponibles?.length || 0);
        
        // ⭐ CAMBIO IMPORTANTE: Redirigir a selección de ubicación
        this.router.navigate(['/seleccion-ubicacion']);
      } else {
        this.errorMessage = 'Usuario o contraseña incorrectos';
      }
    },
    error: (error) => {
      this.errorMessage = error.error.error || 'Usuario o contraseña incorrectos';
    },
  });
  }

  togglePassword() {
    this.showPassword = !this.showPassword; // Alterna visibilidad de contraseña
  }

  requestAccess() {
    alert('Estamos trabajando en esta función. Próximamente se va a agregar.');
  }
}
