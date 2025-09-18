import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReportePorEmpleadoResponse {
    empresa_id: number;
    rango: { inicio: string; fin: string; };
    grouped: boolean;
    datos: any[];    // Si grouped=true → {empleado_id,nombre_empleado,total_comidas}
    // Si grouped=false → detalle de asistencias
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
private baseUrl = 'http://localhost:3000/api/reportes/por-empleado';

    constructor(private http: HttpClient) { }

    reportePorEmpleado(params: {
        empresaId: number;
        periodo: string;
        grouped: boolean;
        fechaInicio?: string;
        fechaFin?: string;
    }): Observable<ReportePorEmpleadoResponse> {
        let httpParams = new HttpParams()
            .set('empresa_id', params.empresaId.toString())
            .set('periodo', params.periodo)
            .set('grouped', String(params.grouped));

        if (params.periodo === 'custom' &&
            params.fechaInicio && params.fechaFin) {
            httpParams = httpParams
                .set('fecha_inicio', params.fechaInicio)
                .set('fecha_fin', params.fechaFin);
        }

        return this.http.get<ReportePorEmpleadoResponse>(
            this.baseUrl,
            { params: httpParams }
        );
    }
}
