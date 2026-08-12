import type { Request, Response } from "express";
import { RolUsuario } from "@prisma/client";

import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "../evaluacion/shared/evaluacion-controller.utils";
import { servicioAuditorias } from "../../services/auditorias/auditorias.service";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import {
  normalizarActualizarAuditoria,
  normalizarActualizarHallazgo,
  normalizarActualizarRecomendacion,
  normalizarCambiarEstadoAuditoria,
  normalizarConsultaAuditorias,
  normalizarCrearAuditoria,
  normalizarCrearHallazgo,
  normalizarCrearRecomendacion,
  normalizarCrearSeguimiento,
} from "../../validators/auditorias.validator";

const ROLES_GOBIERNO_AUDITORIA: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
];

function asegurarGobiernoAuditoria(rol: RolUsuario): void {
  if (!ROLES_GOBIERNO_AUDITORIA.includes(rol)) {
    throw new ErrorEvaluacion(
      "Tu rol puede participar en la gestión y seguimiento de la auditoría, pero no iniciar, finalizar ni cancelar su estado global.",
      403,
      "AUDITORIA_GOBIERNO_REQUERIDO"
    );
  }
}

function queryRecord(req: Request): Record<string, unknown> {
  return req.query as Record<string, unknown>;
}

function bodyRecord(req: Request): Record<string, unknown> {
  return (req.body ?? {}) as Record<string, unknown>;
}

export const controladorAuditorias = {
  listar: async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await servicioAuditorias.listar(
        obtenerUsuarioSesion(req),
        normalizarConsultaAuditorias(queryRecord(req))
      );
      res.json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  obtenerDetalle: async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await servicioAuditorias.obtenerDetalle(
        obtenerParametroRuta(req, "auditoriaId"),
        obtenerUsuarioSesion(req)
      );
      res.json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  crear: async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await servicioAuditorias.crear(
        normalizarCrearAuditoria(bodyRecord(req)),
        obtenerUsuarioSesion(req)
      );
      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  actualizar: async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await servicioAuditorias.actualizar(
        obtenerParametroRuta(req, "auditoriaId"),
        normalizarActualizarAuditoria(bodyRecord(req)),
        obtenerUsuarioSesion(req)
      );
      res.json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  cambiarEstado: async (req: Request, res: Response): Promise<void> => {
    try {
      const usuario = obtenerUsuarioSesion(req);
      asegurarGobiernoAuditoria(usuario.rol);

      const resultado = await servicioAuditorias.cambiarEstado(
        obtenerParametroRuta(req, "auditoriaId"),
        normalizarCambiarEstadoAuditoria(bodyRecord(req)),
        usuario
      );
      res.json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  crearHallazgo: async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await servicioAuditorias.crearHallazgo(
        obtenerParametroRuta(req, "auditoriaId"),
        normalizarCrearHallazgo(bodyRecord(req)),
        obtenerUsuarioSesion(req)
      );
      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  actualizarHallazgo: async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await servicioAuditorias.actualizarHallazgo(
        obtenerParametroRuta(req, "hallazgoId"),
        normalizarActualizarHallazgo(bodyRecord(req)),
        obtenerUsuarioSesion(req)
      );
      res.json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  crearRecomendacion: async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await servicioAuditorias.crearRecomendacion(
        obtenerParametroRuta(req, "hallazgoId"),
        normalizarCrearRecomendacion(bodyRecord(req)),
        obtenerUsuarioSesion(req)
      );
      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  actualizarRecomendacion: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado = await servicioAuditorias.actualizarRecomendacion(
        obtenerParametroRuta(req, "recomendacionId"),
        normalizarActualizarRecomendacion(bodyRecord(req)),
        obtenerUsuarioSesion(req)
      );
      res.json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  registrarSeguimiento: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado = await servicioAuditorias.registrarSeguimiento(
        obtenerParametroRuta(req, "hallazgoId"),
        normalizarCrearSeguimiento(bodyRecord(req)),
        obtenerUsuarioSesion(req)
      );
      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  contextoEmpresa: async (req: Request, res: Response): Promise<void> => {
    try {
      const anioRaw = req.query.anio;
      const anio = anioRaw === undefined ? undefined : Number(anioRaw);
      if (anio !== undefined && (!Number.isInteger(anio) || anio < 2000 || anio > 9999)) {
        res.status(400).json({ error: "El año consultado no es válido." });
        return;
      }

      const resultado = await servicioAuditorias.obtenerContextoEmpresa(
        obtenerParametroRuta(req, "empresaId"),
        anio,
        obtenerUsuarioSesion(req)
      );
      res.json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};