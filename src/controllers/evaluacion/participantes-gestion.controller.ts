import type {
  Request,
  Response,
} from "express";

import { servicioParticipantesGestion } from "../../services/evaluacion/participantes-gestion.service";
import type {
  ActualizarParticipanteGestionInput,
  CrearParticipanteGestionInput,
} from "../../types/evaluacion.types";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./shared/evaluacion-controller.utils";

export const controladorParticipantesGestion = {
  listar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const gestionId = obtenerParametroRuta(req, "gestionId");
      const resultado = await servicioParticipantesGestion.listar(
        gestionId,
        obtenerUsuarioSesion(req)
      );
      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  listarDisponibles: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const gestionId = obtenerParametroRuta(req, "gestionId");
      const resultado =
        await servicioParticipantesGestion.listarDisponibles(
          gestionId,
          obtenerUsuarioSesion(req)
        );
      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  agregar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const gestionId = obtenerParametroRuta(req, "gestionId");
      const resultado = await servicioParticipantesGestion.agregar(
        gestionId,
        req.body as CrearParticipanteGestionInput,
        obtenerUsuarioSesion(req)
      );
      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  actualizar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const gestionId = obtenerParametroRuta(req, "gestionId");
      const participanteId = obtenerParametroRuta(
        req,
        "participanteId"
      );
      const resultado =
        await servicioParticipantesGestion.actualizar(
          gestionId,
          participanteId,
          req.body as ActualizarParticipanteGestionInput,
          obtenerUsuarioSesion(req)
        );
      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  retirar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const gestionId = obtenerParametroRuta(req, "gestionId");
      const participanteId = obtenerParametroRuta(
        req,
        "participanteId"
      );
      const resultado = await servicioParticipantesGestion.retirar(
        gestionId,
        participanteId,
        obtenerUsuarioSesion(req)
      );
      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
