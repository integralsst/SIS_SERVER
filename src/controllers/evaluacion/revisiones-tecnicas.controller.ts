import type {
  Request,
  Response,
} from "express";

import { enriquecerRevisionesConFechaRegistroEvaluacion } from "../../services/evaluacion/presentacion-fecha-registro-revision.service";
import { servicioRevisionesTecnicasFlujo } from "../../services/evaluacion/revisiones-tecnicas-flujo.service";
import { servicioRevisionesTecnicas } from "../../services/evaluacion/revisiones-tecnicas.service";
import type { ResolverRevisionTecnicaInput } from "../../types/evaluacion.types";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./shared/evaluacion-controller.utils";

export const controladorRevisionesTecnicas = {
  listarPeriodo: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const periodoId = obtenerParametroRuta(
        req,
        "periodoId"
      );

      const resultadoBase =
        await servicioRevisionesTecnicasFlujo.listarPeriodo(
          periodoId,
          obtenerUsuarioSesion(req)
        );
      const resultado =
        await enriquecerRevisionesConFechaRegistroEvaluacion(
          resultadoBase
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  resolver: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const revisionId = obtenerParametroRuta(
        req,
        "revisionId"
      );

      const resultado =
        await servicioRevisionesTecnicas.resolver(
          revisionId,
          req.body as ResolverRevisionTecnicaInput,
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
