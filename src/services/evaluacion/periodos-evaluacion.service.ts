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

export function construirCorteAnual(anio: number): Date {
  const ahora = new Date();
  const anioActual = ahora.getUTCFullYear();

  if (anio < anioActual) {
    return new Date(Date.UTC(anio, 11, 31, 23, 59, 59, 999));
  }

  if (anio === anioActual) {
    return ahora;
  }

  return new Date(Date.UTC(anio, 11, 31, 23, 59, 59, 999));
}

export async function resolverVersionParaFecha(
  fecha: Date,
  versionSupermatrizId?: number
) {
  if (versionSupermatrizId) {
    const version = await prisma.versionSupermatriz.findFirst({
      where: {
        id: versionSupermatrizId,
        estado: {
          in: [
            EstadoVersionSupermatriz.VIGENTE,
            EstadoVersionSupermatriz.CERRADA,
          ],
        },
        AND: [
          {
            OR: [
              { vigenteDesde: null },
              { vigenteDesde: { lte: fecha } },
            ],
          },
          {
            OR: [
              { vigenteHasta: null },
              { vigenteHasta: { gte: fecha } },
            ],
          },
        ],
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
        "La versión seleccionada no es aplicable a la fecha indicada.",
        409,
        "VERSION_NO_APLICABLE"
      );
    }

    return version;
  }

  const version = await prisma.versionSupermatriz.findFirst({
    where: {
      estado: {
        in: [
          EstadoVersionSupermatriz.VIGENTE,
          EstadoVersionSupermatriz.CERRADA,
        ],
      },
      AND: [
        {
          OR: [
            { vigenteDesde: null },
            { vigenteDesde: { lte: fecha } },
          ],
        },
        {
          OR: [
            { vigenteHasta: null },
            { vigenteHasta: { gte: fecha } },
          ],
        },
      ],
    },
    orderBy: [
      { vigenteDesde: "desc" },
      { id: "desc" },
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
      "No existe una versión de la Supermatriz aplicable a la fecha indicada.",
      409,
      "VERSION_NO_DISPONIBLE"
    );
  }

  return version;
}

async function resolverVersionParaAnio(
  anio: number,
  versionSupermatrizId?: number
) {
  return resolverVersionParaFecha(
    construirCorteAnual(anio),
    versionSupermatrizId
  );
}

export const servicioPeriodosEvaluacion = {
  obtenerVersionDisponible: resolverVersionParaAnio,
  resolverVersionParaFecha,

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
