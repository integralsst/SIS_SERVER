import type {
  Request,
  Response,
} from "express";

import { servicioGestionesSgsst } from "../../services/evaluacion/gestiones-sgsst.service";
import { servicioHistorialGestiones } from "../../services/evaluacion/historial-gestiones.service";
import { servicioInvalidacionesGestion } from "../../services/evaluacion/invalidaciones-gestion.service";
import type {
  CrearGestionSgsstInput,
  InvalidarGestionSgsstInput,
} from "../../types/evaluacion.types";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./shared/evaluacion-controller.utils";

export const controladorGestionesSgsst = {
  listar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const periodoId = obtenerParametroRuta(
        req,
        "periodoId"
      );

      const resultado =
        await servicioHistorialGestiones.listar(
          periodoId,
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  crear: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const periodoId = obtenerParametroRuta(
        req,
        "periodoId"
      );

      const gestion = await servicioGestionesSgsst.crear(
        periodoId,
        req.body as CrearGestionSgsstInput,
        obtenerUsuarioSesion(req)
      );

      res.status(201).json(gestion);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  invalidar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const gestionId = obtenerParametroRuta(
        req,
        "gestionId"
      );

      const resultado =
        await servicioInvalidacionesGestion.invalidar(
          gestionId,
          req.body as InvalidarGestionSgsstInput,
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
