import type {
  PrismaClient,
} from "@prisma/client";

import { eliminarRegistros } from "./registro-eliminacion";

export async function eliminarSupermatrizCompleta(
  prisma: PrismaClient
): Promise<void> {
  console.log("");
  console.log(
    "4/4 Eliminando Supermatriz y catálogos globales..."
  );

  await eliminarRegistros(
    "Historial de la Supermatriz",
    () =>
      prisma.historialCambioSupermatriz.deleteMany()
  );
  await eliminarRegistros(
    "Categorías asociadas a tareas",
    () =>
      prisma.supermatrizTareaCategoriaGestion.deleteMany()
  );
  await eliminarRegistros(
    "Filas de la Supermatriz",
    () =>
      prisma.supermatrizTarea.deleteMany()
  );
  await eliminarRegistros(
    "Relaciones estándar-grupo ministerial",
    () =>
      prisma.estandarGrupoMinisterial.deleteMany()
  );
  await eliminarRegistros(
    "Relaciones aspecto-palabra clave",
    () =>
      prisma.aspectoPalabraClave.deleteMany()
  );
  await eliminarRegistros(
    "Relaciones aspecto-requisito normativo",
    () =>
      prisma.aspectoRequisitoNormativo.deleteMany()
  );
  await eliminarRegistros(
    "Reglas de aprobación",
    () =>
      prisma.reglaAprobacionGestion.deleteMany()
  );
  await eliminarRegistros(
    "Vigencias de aspectos",
    () => prisma.vigenciaAspecto.deleteMany()
  );
  await eliminarRegistros(
    "Configuraciones de revisión técnica",
    () =>
      prisma.configuracionRevisionTecnica.deleteMany()
  );
  await eliminarRegistros(
    "Configuraciones de evidencia",
    () =>
      prisma.configuracionEvidenciaAspecto.deleteMany()
  );
  await eliminarRegistros(
    "Configuraciones de tarea cotidiana",
    () =>
      prisma.configuracionTareaCotidiana.deleteMany()
  );
  await eliminarRegistros(
    "Configuraciones de vigencia",
    () =>
      prisma.configuracionVigenciaAspecto.deleteMany()
  );
  await eliminarRegistros(
    "Configuraciones generales de aspectos",
    () =>
      prisma.configuracionAspecto.deleteMany()
  );
  await eliminarRegistros(
    "Planes de acción específicos",
    () =>
      prisma.planAccionEspecifico.deleteMany()
  );
  await eliminarRegistros(
    "Palabras clave",
    () => prisma.palabraClave.deleteMany()
  );
  await eliminarRegistros(
    "Requisitos normativos",
    () => prisma.requisitoNormativo.deleteMany()
  );
  await eliminarRegistros(
    "Aspectos",
    () => prisma.aspecto.deleteMany()
  );
  await eliminarRegistros(
    "Estándares",
    () => prisma.estandar.deleteMany()
  );
  await eliminarRegistros(
    "Categorías de estándar",
    () => prisma.categoriaEstandar.deleteMany()
  );
  await eliminarRegistros(
    "Ciclos PHVA",
    () => prisma.cicloPhva.deleteMany()
  );
  await eliminarRegistros(
    "Procesos",
    () => prisma.proceso.deleteMany()
  );

  await prisma.versionSupermatriz.updateMany({
    where: {
      clonadaDeId: {
        not: null,
      },
    },
    data: {
      clonadaDeId: null,
    },
  });

  await eliminarRegistros(
    "Versiones de la Supermatriz",
    () =>
      prisma.versionSupermatriz.deleteMany()
  );
  await eliminarRegistros(
    "Categorías de gestión globales",
    () => prisma.categoriaGestion.deleteMany()
  );
  await eliminarRegistros(
    "Grupos ministeriales globales",
    () => prisma.grupoMinisterial.deleteMany()
  );
}

