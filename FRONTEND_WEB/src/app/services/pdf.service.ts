import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  private readonly API_URL = 'http://localhost:3000/api/pdf/generate';

  constructor(private http: HttpClient) {}

  generatePdf(htmlContent: string): Observable<Blob> {
    return this.http.post(this.API_URL, { htmlContent }, { responseType: 'blob' });
  }
}
