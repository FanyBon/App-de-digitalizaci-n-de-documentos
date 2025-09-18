// src/controllers/UsuarioPerfilController.ts
import { Request, Response } from 'express';
import { UsuarioPerfil } from '../../models/usuarios_plataforma/UsuarioPerfil';

export default class UsuarioPerfilController {
  static async listarTodos(req: Request, res: Response) {
    const data = await UsuarioPerfil.listarTodos();
    res.status(200).json(data);
  }

  static async listarPorUsuario(req: Request, res: Response) {
    const usuarioId = Number(req.params.usuario_id);
    const data = await UsuarioPerfil.listarPorUsuario(usuarioId);
    res.status(200).json(data);
  }

  static async asignarPerfil(req: Request, res: Response) {
    const { usuario_id, perfil_id } = req.body;
    await UsuarioPerfil.asignarPerfil(usuario_id, perfil_id);
    res.status(201).json({ message: 'Perfil asignado correctamente' });
  }

  static async quitarPerfil(req: Request, res: Response) {
    const { usuario_id, perfil_id } = req.body;
    await UsuarioPerfil.quitarPerfil(usuario_id, perfil_id);
    res.status(204).send();
  }
}
