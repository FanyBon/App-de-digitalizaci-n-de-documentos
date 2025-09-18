import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
// Asegúrate de que la ruta del servicio sea correcta según tu estructura de carpetas
import { AuthControlComidasService } from 'src/app/services/sistemas/control_comidas/auth-control-comidas.service';

@Component({
  selector: 'app-logincontrolcomidas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',  // Nombre del archivo HTML
  styleUrls: ['./login.component.css'],
})
export class LoginControlComidasComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  showPassword: boolean = false;

  constructor(private authService: AuthControlComidasService, private router: Router) {}

  onSubmit() {
    this.authService.loginControl(this.username, this.password).subscribe({
      next: (response) => {
        // Guarda el token con la nueva llave
        localStorage.setItem('tokencontrolcomidas', response.token);
        this.router.navigate(['/comedores/control-comidas']);
      },
      error: (err) => {
        this.errorMessage = 'Usuario o contraseña incorrectos';
      },
    });
  }
  
  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
