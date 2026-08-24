import type { Request, Response } from "express";

import { servicioCentroAccionesMultiempresa } from "../../services/alertas/centro-acciones-multiempresa.service";
import { servicioCentroAcciones } from "../../services/alertas/centro-acciones.service";
import { normalizarConsultaCentroAcciones } from "../../validators/alertas/centro-acciones.validator";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "../evaluacion/shared/evaluacion-controller.utils";

export const controladorCentroAcciones = {
  destacadas: async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await servicioCentroAcciones.listar(
        obtenerUsuarioSesion(req)
      );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  resumen: async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await servicioCentroAccionesMultiempresa.resumen(
        obtenerUsuarioSesion(req)
      );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  listarEmpresas: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const consulta = normalizarConsultaCentroAcciones(
        req.query as Record<string, unknown>
      );
      const resultado =
        await servicioCentroAccionesMultiempresa.listarEmpresas(
          obtenerUsuarioSesion(req),
          consulta
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  listarAccionesEmpresa: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const consulta = normalizarConsultaCentroAcciones(
        req.query as Record<string, unknown>
      );
      const resultado =
        await servicioCentroAccionesMultiempresa.listarAccionesEmpresa(
          obtenerUsuarioSesion(req),
          obtenerParametroRuta(req, "empresaId"),
          consulta
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
