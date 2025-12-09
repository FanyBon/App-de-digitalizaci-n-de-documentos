import { getPool } from '../../config/db_controlcomidas';

export interface VentaPDVInterface {
  id?: number;
  fecha_hora?: Date;
  empleado_id: number;
  usuario_id: number;
  total_venta: number;
  subsidio_aplicado: number;
  tipo_venta: 'pdv' | 'comedor' | 'mixto' | 'AUTOCOBRO';
  monedero_id: number;
  metodo_pago_id: number;
  impuesto_id?: number;
  impuesto_monto?: number;
  punto_venta_id?: number | null;      // ✅ NUEVO
  punto_venta_codigo?: string | null;  // ✅ NUEVO
  referencia?: string;
  created_at?: Date;
}

export class VentaPDV {

  // Función para generar la referencia
  // Formato: VENTA-{timestamp}-{sufijo de 3 dígitos}
  static generarReferencia(): string {
    const prefix = "VENTA-";
    const timestamp = Date.now();
    const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix}${timestamp}-${suffix}`;
  }

  // Listar todas las ventas
  static async listar(): Promise<VentaPDVInterface[]> {
    const conn = await getPool('local');
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM ventas_pdv');
      return rows;
    } catch (error) {
      console.error('Error al listar ventas:', error);
      throw new Error('Error al listar ventas');
    }
  }

  // Obtener una venta por ID
  static async obtenerPorId(id: number): Promise<VentaPDVInterface | null> {
    const conn = await getPool('local');
    try {
      const [rows]: [any[], any] = await conn.query('SELECT * FROM ventas_pdv WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error('Error al obtener venta:', error);
      throw new Error('Error al obtener venta');
    }
  }

  // Crear una nueva venta
  static async crear(venta: VentaPDVInterface): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getPool('local');
    try {
      // Si no se pasó una referencia, se genera automáticamente
      if (!venta.referencia) {
        venta.referencia = VentaPDV.generarReferencia();
      }
      
      const [result]: any = await conn.query(
        `INSERT INTO ventas_pdv (
          fecha_hora, empleado_id, usuario_id, total_venta, subsidio_aplicado, 
          tipo_venta, monedero_id, metodo_pago_id, impuesto_id, impuesto_monto,
          punto_venta_id, punto_venta_codigo, referencia, created_at
        ) 
        VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          venta.empleado_id,
          venta.usuario_id,
          venta.total_venta,
          venta.subsidio_aplicado,
          venta.tipo_venta,
          venta.monedero_id,
          venta.metodo_pago_id,
          venta.impuesto_id ?? null,
          venta.impuesto_monto ?? null,
          venta.punto_venta_id ?? null,      // ✅ NUEVO
          venta.punto_venta_codigo ?? null,  // ✅ NUEVO
          venta.referencia
        ]
      );

      return {
        success: true,
        data: { id: result.insertId, ...venta, fecha_hora: new Date(), created_at: new Date() }
      };
    } catch (error: any) {
      console.error('Error al crear venta:', error);
      return { success: false, error: 'Error al crear la venta' };
    }
  }

  // Editar una venta
  static async editar(id: number, data: Partial<VentaPDVInterface>): Promise<{ success: boolean; data?: any; error?: string }> {
    const conn = await getPool('local');
    try {
      const [result]: any = await conn.query(`UPDATE ventas_pdv SET ? WHERE id = ?`, [data, id]);
      if (result.affectedRows === 0) return { success: false, error: 'Venta no encontrada' };
      return { success: true, data: { id, ...data } };
    } catch (error: any) {
      console.error('Error al editar venta:', error);
      return { success: false, error: 'Error al editar la venta' };
    }
  }

  // Eliminar una venta
  static async eliminar(id: number): Promise<{ success: boolean; error?: string }> {
    const conn = await getPool('local');
    try {
      const [result]: any = await conn.query(`DELETE FROM ventas_pdv WHERE id = ?`, [id]);
      if (result.affectedRows === 0) return { success: false, error: 'Venta no encontrada' };
      return { success: true };
    } catch (error: any) {
      console.error('Error al eliminar venta:', error);
      return { success: false, error: 'Error al eliminar la venta' };
    }
  }
}