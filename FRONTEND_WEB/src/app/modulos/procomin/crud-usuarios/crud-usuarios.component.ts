import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from 'src/app/services/sistemas/user.service'; // Asegúrate de que la ruta sea correcta


@Component({
  selector: 'app-crud-usuarios',
  standalone: true, // Indica que el componente es independiente
  templateUrl: './crud-usuarios.component.html',
  styleUrls: ['./crud-usuarios.component.css'],
  imports: [CommonModule, FormsModule], // Agregar FormsModule aquí
})
export class CrudUsuariosComponent {

  mostrarFormulario: boolean = false;  // Controla la visibilidad del formulario
  usuarios: any[] = []; // Lista de usuarios

  usuario = {
    username: '',
    email: '',
    password: '',
    role: '',
    name: '',
    phone: '',
    whatsapp: '',
    comedor: '',
    position: ''
  };

  constructor(private userService: UserService) {}
  

  // Función para alternar el formulario
  toggleFormulario() {
    this.mostrarFormulario = !this.mostrarFormulario;
  }

  crearUsuario() {
    this.userService.registerUser(this.usuario).subscribe({
      next: (response) => {
        alert('Usuario registrado correctamente');
        console.log(response);
      },
      error: (error) => {
        alert('Error al registrar usuario');
        console.error(error);
      }
    });
  }
}
