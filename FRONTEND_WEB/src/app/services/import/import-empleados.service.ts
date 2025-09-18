// src/app/modulos/procomin/services/import-empleados.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ImportReport {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  monederosReactivated: number;
  monederosInactivated: number;
  total: number;
}

export interface ImportReport {
  total: number;
  created: number;
  updated: number;
  reactivated: number;
  skipped: number;
  inactivated: number;
  monederosCreated: number;
  monederosReactivated: number;
  monederosInactivated: number;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ImportEmpleadosService {
  private apiUrl = 'http://localhost:3000/api/imports/empleados';

  constructor(private http: HttpClient) { }

  importarCSV(file: File): Observable<ImportReport> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ImportReport>(this.apiUrl, form);
  }
}
