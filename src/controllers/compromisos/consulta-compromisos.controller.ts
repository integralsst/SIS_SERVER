import type {
  Request,
  Response,
} from "express";

import { servicioCentroAcciones } from "../../services/alertas/centro-acciones.service";
import { obtenerAdministracionCompromiso } from "../../services/compromisos/administracion-compromiso.service";
import { servicioConsultaCompromisos } from "../../services/compromisos/consulta-compromisos.service";
import { normalizarConsultaCompromisos } from "../../validators/compromisos/consulta-compromisos.validator";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "../evaluacion/shared/evaluacion-controller.utils";

export const controladorConsultaCompromisos = {
  listarAlertas: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado = await servicioCentroAcciones.listar(
        obtenerUsuarioSesion(req)
      );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  listar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const consulta =
        normalizarConsultaCompromisos(
          req.query as Record<string, unknown>
        );

      const resultado =
        await servicioConsultaCompromisos.listar(
          consulta,
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  obtenerDetalle: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado =
        await servicioConsultaCompromisos.obtenerDetalle(
          obtenerParametroRuta(
            req,
            "compromisoId"
          ),
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  obtenerAdministracion: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado =
        await obtenerAdministracionCompromiso(
          obtenerParametroRuta(
            req,
            "compromisoId"
          ),
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
