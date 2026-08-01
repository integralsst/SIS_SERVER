import {
  EstadoPeriodoSgsst,
  EstadoVersionSupermatriz,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  AbrirPeriodoEvaluacionInput,
  UsuarioSesionEvaluacion,
} from "../../types/evaluacion.types";
import {
  ErrorEvaluacion,
  validarAnio,
} from "../../utils/evaluacion";
import { asegurarAccesoEmpresa } from "./acceso-evaluacion.service";

async function resolverVersionParaAnio(
  anio: number,
  versionSupermatrizId?: number
) {
  const inicio = new Date(`${anio}-01-01T12:00:00.000Z`);
  const fin = new Date(`${anio}-12-31T12:00:00.000Z`);

  if (versionSupermatrizId) {
    const version = await prisma.versionSupermatriz.findFirst({
      where: {
        id: versionSupermatrizId,
        estado: EstadoVersionSupermatriz.VIGENTE,
      },
      select: {
        id: true,
        nombre: true,
        estado: true,
        vigenteDesde: true,
        vigenteHasta: true,
      },
    });

    if (!version) {
      throw new ErrorEvaluacion(
        "La versión seleccionada no existe o no está vigente.",
        409,
        "VERSION_NO_VIGENTE"
      );
    }

    return version;
  }

  const version = await prisma.versionSupermatriz.findFirst({
    where: {
      estado: EstadoVersionSupermatriz.VIGENTE,
      AND: [
        {
          OR: [
            {
              vigenteDesde: null,
            },
            {
              vigenteDesde: {
                lte: fin,
              },
            },
          ],
        },
        {
          OR: [
            {
              vigenteHasta: null,
            },
            {
              vigenteHasta: {
                gte: inicio,
              },
            },
          ],
        },
      ],
    },
    orderBy: [
      {
        vigenteDesde: "desc",
      },
      {
        id: "desc",
      },
    ],
    select: {
      id: true,
      nombre: true,
      estado: true,
      vigenteDesde: true,
      vigenteHasta: true,
    },
  });

  if (!version) {
    throw new ErrorEvaluacion(
      `No existe una versión vigente de la Supermatriz aplicable al año ${anio}.`,
      409,
      "VERSION_NO_DISPONIBLE"
    );
  }

  return version;
}

export const servicioPeriodosEvaluacion = {
  obtenerVersionDisponible: resolverVersionParaAnio,

  abrir: async (
    empresaId: string,
    data: AbrirPeriodoEvaluacionInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    validarAnio(data.anio);

    await asegurarAccesoEmpresa(
      usuario,
      empresaId,
      "ESCRITURA"
    );

    const existente = await prisma.empresaPeriodo.findUnique({
      where: {
        empresaId_anio: {
          empresaId,
          anio: data.anio,
        },
      },
      include: {
        versionSupermatriz: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    if (existente) {
      return existente;
    }

    const version = await resolverVersionParaAnio(
      data.anio,
      data.versionSupermatrizId
    );

    return prisma.empresaPeriodo.create({
      data: {
        empresaId,
        versionSupermatrizId: version.id,
        anio: data.anio,
        estado: EstadoPeriodoSgsst.ABIERTO,
        creadoPorUsuarioId: usuario.usuarioId,
      },
      include: {
        versionSupermatriz: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });
  },
};
