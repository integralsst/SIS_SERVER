import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  asegurarVersionBorrador,
  comoJsonPrisma,
  ErrorValidacionSupermatriz,
} from "../../utils/supermatriz";

export interface DatosLogicaEvaluacionAspecto {
  versionSupermatrizId: number;
  logicaEvaluacion: string | null;
}

async function registrarCambio(
  tx: Prisma.TransactionClient,
  data: {
    versionSupermatrizId: number;
    aspectoId: number;
    usuarioId: string;
    datosAntes: unknown;
    datosDespues: unknown;
  }
): Promise<void> {
  await tx.historialCambioSupermatriz.create({
    data: {
      versionSupermatrizId: data.versionSupermatrizId,
      tipoEntidad: "Aspecto",
      entidadId: data.aspectoId,
      accion: "ACTUALIZAR_LOGICA_EVALUACION",
      descripcion:
        "Actualización de la lógica de evaluación del aspecto.",
      datosAntes: comoJsonPrisma(data.datosAntes),
      datosDespues: comoJsonPrisma(data.datosDespues),
      usuarioId: data.usuarioId,
    },
  });
}

async function actualizar(
  aspectoId: number,
  data: DatosLogicaEvaluacionAspecto,
  usuarioId: string
) {
  return prisma.$transaction(async (tx) => {
    await asegurarVersionBorrador(
      tx,
      data.versionSupermatrizId
    );

    const anterior = await tx.aspecto.findUnique({
      where: { id: aspectoId },
    });

    if (!anterior) {
      throw new ErrorValidacionSupermatriz(
        "El aspecto no existe."
      );
    }

    if (
      anterior.versionSupermatrizId !==
      data.versionSupermatrizId
    ) {
      throw new ErrorValidacionSupermatriz(
        "El aspecto no pertenece a la versión seleccionada."
      );
    }

    const actualizado = await tx.aspecto.update({
      where: { id: aspectoId },
      data: {
        logicaEvaluacion: data.logicaEvaluacion,
      },
    });

    if (
      anterior.logicaEvaluacion !==
      actualizado.logicaEvaluacion
    ) {
      await registrarCambio(tx, {
        versionSupermatrizId:
          data.versionSupermatrizId,
        aspectoId,
        usuarioId,
        datosAntes: {
          logicaEvaluacion: anterior.logicaEvaluacion,
        },
        datosDespues: {
          logicaEvaluacion: actualizado.logicaEvaluacion,
        },
      });
    }

    return actualizado;
  });
}

async function sincronizarClonacion(
  versionOrigenId: number,
  versionDestinoId: number
): Promise<void> {
  const [origen, destino] = await Promise.all([
    prisma.aspecto.findMany({
      where: {
        versionSupermatrizId: versionOrigenId,
      },
      select: {
        identidadHistorica: true,
        logicaEvaluacion: true,
      },
    }),
    prisma.aspecto.findMany({
      where: {
        versionSupermatrizId: versionDestinoId,
      },
      select: {
        id: true,
        identidadHistorica: true,
      },
    }),
  ]);

  if (origen.length !== destino.length) {
    throw new ErrorValidacionSupermatriz(
      "No es seguro sincronizar la lógica de evaluación: la versión clonada no contiene la misma cantidad de aspectos que su origen."
    );
  }

  const logicaPorIdentidad = new Map(
    origen.map((aspecto) => [
      aspecto.identidadHistorica,
      aspecto.logicaEvaluacion,
    ])
  );

  if (logicaPorIdentidad.size !== origen.length) {
    throw new ErrorValidacionSupermatriz(
      "No es seguro sincronizar la lógica de evaluación: existen identidades históricas ambiguas en la versión de origen."
    );
  }

  const actualizaciones = destino.map((aspecto) => {
    if (!logicaPorIdentidad.has(aspecto.identidadHistorica)) {
      throw new ErrorValidacionSupermatriz(
        "No fue posible conservar la lógica de evaluación de todos los aspectos durante la clonación."
      );
    }

    return prisma.aspecto.update({
      where: { id: aspecto.id },
      data: {
        logicaEvaluacion:
          logicaPorIdentidad.get(
            aspecto.identidadHistorica
          ) ?? null,
      },
    });
  });

  await prisma.$transaction(actualizaciones);
}

export const servicioLogicaEvaluacionAspecto = {
  actualizar,
  sincronizarClonacion,
};
