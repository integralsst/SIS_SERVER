import type {
  Request,
  Response,
} from "express";

import { servicioLogicaEvaluacionAspecto } from "../../services/supermatriz/logica-evaluacion-aspecto.service";
import { limpiarVersionClonadaIncompleta } from "../../services/supermatriz/limpiar-version-clonada.service";
import { servicioVersionesSupermatriz } from "../../services/supermatriz/versiones-supermatriz.service";
import {
  ErrorValidacionSupermatriz,
  fechaOpcional,
  normalizarTexto,
  responderErrorSupermatriz,
  textoOpcional,
} from "../../utils/supermatriz";

function construirDatosVersion(
  body: Record<string, unknown>
) {
  const nombre =
    normalizarTexto(
      body.nombre ?? body.name
    );

  if (!nombre) {
    throw new ErrorValidacionSupermatriz(
      "El nombre de la versión es obligatorio."
    );
  }

  const vigenteDesde =
    fechaOpcional(
      body.vigenteDesde ??
        body.validFrom
    );

  const vigenteHasta =
    fechaOpcional(
      body.vigenteHasta ??
        body.validUntil
    );

  if (
    vigenteDesde &&
    vigenteHasta &&
    vigenteHasta.getTime() <
      vigenteDesde.getTime()
  ) {
    throw new ErrorValidacionSupermatriz(
      "La fecha final no puede ser anterior a la fecha inicial."
    );
  }

  return {
    nombre,
    descripcion:
      textoOpcional(
        body.descripcion ??
          body.description
      ),
    vigenteDesde,
    vigenteHasta,
  };
}

function obtenerActor(
  req: Request,
  res: Response
): string | null {
  if (!req.user) {
    res.status(401).json({
      error: "No autorizado.",
    });
    return null;
  }

  return req.user.usuarioId;
}

export const controladorVersionesSupermatriz = {
  obtenerTodas: async (
    _req: Request,
    res: Response
  ): Promise<void> => {
    try {
      res.json(
        await servicioVersionesSupermatriz.obtenerTodas()
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "VERSIONES-LISTAR"
      );
    }
  },

  obtenerPorId: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const version =
        await servicioVersionesSupermatriz.obtenerPorId(
          Number(req.params.id)
        );

      if (!version) {
        res.status(404).json({
          error:
            "Versión no encontrada.",
        });
        return;
      }

      res.json(version);
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "VERSIONES-DETALLE"
      );
    }
  },

  crear: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        obtenerActor(req, res);
      if (!actor) return;

      res.status(201).json(
        await servicioVersionesSupermatriz.crear(
          construirDatosVersion(
            req.body
          ),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "VERSIONES-CREAR"
      );
    }
  },

  actualizar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        obtenerActor(req, res);
      if (!actor) return;

      res.json(
        await servicioVersionesSupermatriz.actualizar(
          Number(req.params.id),
          construirDatosVersion(
            req.body
          ),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "VERSIONES-ACTUALIZAR"
      );
    }
  },

  clonar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    let nuevaVersionId: number | null = null;

    try {
      const actor =
        obtenerActor(req, res);
      if (!actor) return;

      const versionOrigenId = Number(req.params.id);
      const nuevaVersion =
        await servicioVersionesSupermatriz.clonar(
          versionOrigenId,
          construirDatosVersion(
            req.body
          ),
          actor
        );

      nuevaVersionId = nuevaVersion.id;

      await servicioLogicaEvaluacionAspecto.sincronizarClonacion(
        versionOrigenId,
        nuevaVersion.id
      );

      res.status(201).json(
        (await servicioVersionesSupermatriz.obtenerPorId(
          nuevaVersion.id
        )) ?? nuevaVersion
      );
    } catch (error) {
      if (nuevaVersionId) {
        await limpiarVersionClonadaIncompleta(
          nuevaVersionId
        );
      }

      responderErrorSupermatriz(
        res,
        error,
        "VERSIONES-CLONAR"
      );
    }
  },

  publicar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        obtenerActor(req, res);
      if (!actor) return;

      res.json(
        await servicioVersionesSupermatriz.publicar(
          Number(req.params.id),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "VERSIONES-PUBLICAR"
      );
    }
  },

  cerrar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const actor =
        obtenerActor(req, res);
      if (!actor) return;

      res.json(
        await servicioVersionesSupermatriz.cerrar(
          Number(req.params.id),
          actor
        )
      );
    } catch (error) {
      responderErrorSupermatriz(
        res,
        error,
        "VERSIONES-CERRAR"
      );
    }
  },
};
