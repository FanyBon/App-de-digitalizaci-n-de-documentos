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
        // Si se recibe un token, lo almacenamos y redirigimos
        if (response.token) {
          // En caso de que el backend responda con el nombre de usuario, se utiliza ese dato
          this.router.navigate(['/comedores/control-comidas']);
        } else {
          this.errorMessage = 'Usuario o contraseña incorrectos';
        }
      },
      error: (error) => {
        // Controlamos el error recibido, normalmente en error.error.error se encuentra el mensaje del backend
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
