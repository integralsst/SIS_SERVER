import { Prisma } from "@prisma/client";
import type {
  Request,
  Response,
} from "express";

import { prisma } from "../../lib/prisma";
import { servicioParticipantesGestion } from "../../services/evaluacion/participantes-gestion.service";
import type {
  ActualizarParticipanteGestionInput,
  CrearParticipanteGestionInput,
  UsuarioSesionEvaluacion,
} from "../../types/evaluacion.types";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./shared/evaluacion-controller.utils";

async function obtenerSnapshotEquipo(gestionId: string) {
  const participantes = await prisma.gestionParticipante.findMany({
    where: {
      gestionId,
    },
    orderBy: [
      {
        fechaInicio: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: {
      id: true,
      profesionalId: true,
      esLider: true,
      puedeEvaluar: true,
      puedeGestionarEvidencias: true,
      responsabilidad: true,
      activo: true,
      fechaInicio: true,
      fechaFin: true,
      asignadoPorUsuarioId: true,
      retiradoPorUsuarioId: true,
      profesional: {
        select: {
          nombres: true,
          apellidos: true,
          correo: true,
        },
      },
    },
  });

  return participantes.map((participante) => ({
    ...participante,
    fechaInicio: participante.fechaInicio.toISOString(),
    fechaFin: participante.fechaFin?.toISOString() ?? null,
  })) as Prisma.InputJsonValue;
}

async function registrarCambioEquipo(
  gestionId: string,
  usuario: UsuarioSesionEvaluacion,
  accion: string,
  descripcion: string,
  datosAntes: Prisma.InputJsonValue,
  datosDespues: Prisma.InputJsonValue
): Promise<void> {
  await prisma.historialEvaluacion.create({
    data: {
      gestionId,
      usuarioId: usuario.usuarioId,
      accion,
      descripcion,
      datosAntes,
      datosDespues,
    },
  });
}

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
      const usuario = obtenerUsuarioSesion(req);
      const antes = await obtenerSnapshotEquipo(gestionId);
      const resultado = await servicioParticipantesGestion.agregar(
        gestionId,
        req.body as CrearParticipanteGestionInput,
        usuario
      );
      const despues = await obtenerSnapshotEquipo(gestionId);

      await registrarCambioEquipo(
        gestionId,
        usuario,
        "AGREGAR_PARTICIPANTE_GESTION",
        `Se agregó a ${resultado.profesional.nombres} ${resultado.profesional.apellidos} al equipo de la gestión.`,
        antes,
        despues
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
      const usuario = obtenerUsuarioSesion(req);
      const antes = await obtenerSnapshotEquipo(gestionId);
      const resultado =
        await servicioParticipantesGestion.actualizar(
          gestionId,
          participanteId,
          req.body as ActualizarParticipanteGestionInput,
          usuario
        );
      const despues = await obtenerSnapshotEquipo(gestionId);

      await registrarCambioEquipo(
        gestionId,
        usuario,
        "ACTUALIZAR_PARTICIPANTE_GESTION",
        `Se actualizaron la responsabilidad, permisos o liderazgo de ${resultado.profesional.nombres} ${resultado.profesional.apellidos}.`,
        antes,
        despues
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
      const usuario = obtenerUsuarioSesion(req);
      const antes = await obtenerSnapshotEquipo(gestionId);
      const resultado = await servicioParticipantesGestion.retirar(
        gestionId,
        participanteId,
        usuario
      );
      const despues = await obtenerSnapshotEquipo(gestionId);

      await registrarCambioEquipo(
        gestionId,
        usuario,
        "RETIRAR_PARTICIPANTE_GESTION",
        `Se retiró a ${resultado.profesional.nombres} ${resultado.profesional.apellidos} del equipo de la gestión.`,
        antes,
        despues
      );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
