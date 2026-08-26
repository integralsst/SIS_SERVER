import { prisma } from "../../lib/prisma";

export async function limpiarVersionClonadaIncompleta(
  versionSupermatrizId: number
): Promise<void> {
  const operaciones: Array<{
    nombre: string;
    ejecutar: () => Promise<unknown>;
  }> = [
    {
      nombre: "historial de la versión incompleta",
      ejecutar: () =>
        prisma.historialCambioSupermatriz.deleteMany({
          where: { versionSupermatrizId },
        }),
    },
    {
      nombre: "categorías de gestión de las filas",
      ejecutar: () =>
        prisma.supermatrizTareaCategoriaGestion.deleteMany({
          where: {
            supermatrizTarea: { versionSupermatrizId },
          },
        }),
    },
    {
      nombre: "filas de la Supermatriz",
      ejecutar: () =>
        prisma.supermatrizTarea.deleteMany({
          where: { versionSupermatrizId },
        }),
    },
    {
      nombre: "aspectos",
      ejecutar: () =>
        prisma.aspecto.deleteMany({
          where: { versionSupermatrizId },
        }),
    },
    {
      nombre: "estándares",
      ejecutar: () =>
        prisma.estandar.deleteMany({
          where: { versionSupermatrizId },
        }),
    },
    {
      nombre: "categorías de estándar",
      ejecutar: () =>
        prisma.categoriaEstandar.deleteMany({
          where: { versionSupermatrizId },
        }),
    },
    {
      nombre: "ciclos PHVA",
      ejecutar: () =>
        prisma.cicloPhva.deleteMany({
          where: { versionSupermatrizId },
        }),
    },
    {
      nombre: "procesos",
      ejecutar: () =>
        prisma.proceso.deleteMany({
          where: { versionSupermatrizId },
        }),
    },
    {
      nombre: "palabras clave",
      ejecutar: () =>
        prisma.palabraClave.deleteMany({
          where: { versionSupermatrizId },
        }),
    },
    {
      nombre: "requisitos normativos",
      ejecutar: () =>
        prisma.requisitoNormativo.deleteMany({
          where: { versionSupermatrizId },
        }),
    },
    {
      nombre: "versión incompleta",
      ejecutar: () =>
        prisma.versionSupermatriz.delete({
          where: { id: versionSupermatrizId },
        }),
    },
  ];

  for (const operacion of operaciones) {
    try {
      await operacion.ejecutar();
    } catch (error) {
      console.error(
        `[SUPERMATRIZ-CLONAR-LIMPIEZA-5G] No fue posible eliminar ${operacion.nombre}.`,
        error
      );
    }
  }
}
