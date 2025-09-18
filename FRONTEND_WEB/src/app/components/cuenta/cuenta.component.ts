import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cuenta',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './cuenta.component.html',
  styleUrls: ['./cuenta.component.css']
})
export class CuentaComponent {
  userName: string = 'Miguel Hernández';
  userEmail: string = 'miguel@example.com';

  updateUserInfo() {
    console.log('Información actualizada:', this.userName, this.userEmail);
  }
}