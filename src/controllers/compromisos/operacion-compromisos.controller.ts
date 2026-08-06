import type {
  Request,
  Response,
} from "express";

import { cambiarEstadoActividadCompromiso } from "../../services/compromisos/actividades-compromiso.service";
import {
  reasignarCompromiso,
  rechazarAsignacionCompromiso,
} from "../../services/compromisos/asignaciones-compromiso.service";
import {
  decidirCierreCompromiso,
  solicitarCierreCompromiso,
} from "../../services/compromisos/cierre-compromiso.service";
import { crearEvidenciaCompromiso } from "../../services/compromisos/evidencias-compromiso.service";
import { crearSeguimientoCompromiso } from "../../services/compromisos/seguimientos-compromiso.service";
import {
  validarCambiarActividad,
  validarCrearEvidencia,
  validarCrearSeguimiento,
  validarDecidirCierre,
  validarReasignarCompromiso,
  validarRechazarAsignacion,
} from "../../validators/compromisos/operacion-compromisos.validator";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "../evaluacion/shared/evaluacion-controller.utils";

export const controladorOperacionCompromisos = {
  crearSeguimiento: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado =
        await crearSeguimientoCompromiso(
          obtenerParametroRuta(
            req,
            "compromisoId"
          ),
          validarCrearSeguimiento(req.body),
          obtenerUsuarioSesion(req)
        );

      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  cambiarActividad: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado =
        await cambiarEstadoActividadCompromiso(
          obtenerParametroRuta(
            req,
            "compromisoId"
          ),
          obtenerParametroRuta(req, "actividadId"),
          validarCambiarActividad(req.body),
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  crearEvidencia: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado =
        await crearEvidenciaCompromiso(
          obtenerParametroRuta(
            req,
            "compromisoId"
          ),
          validarCrearEvidencia(req.body),
          obtenerUsuarioSesion(req)
        );

      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  rechazarAsignacion: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado =
        await rechazarAsignacionCompromiso(
          obtenerParametroRuta(
            req,
            "compromisoId"
          ),
          validarRechazarAsignacion(req.body),
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  reasignar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado = await reasignarCompromiso(
        obtenerParametroRuta(req, "compromisoId"),
        validarReasignarCompromiso(req.body),
        obtenerUsuarioSesion(req)
      );

      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  solicitarCierre: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado =
        await solicitarCierreCompromiso(
          obtenerParametroRuta(
            req,
            "compromisoId"
          ),
          obtenerUsuarioSesion(req)
        );

      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  decidirCierre: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado =
        await decidirCierreCompromiso(
          obtenerParametroRuta(
            req,
            "compromisoId"
          ),
          obtenerParametroRuta(req, "solicitudId"),
          validarDecidirCierre(req.body),
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
