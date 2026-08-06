import type {
  PrismaClient,
} from "@prisma/client";

import { eliminarRegistros } from "./registro-eliminacion";

export async function eliminarIdentidades(
  prisma: PrismaClient
): Promise<void> {
  console.log("");
  console.log(
    "3/4 Eliminando permisos, asignaciones e identidades..."
  );

  await eliminarRegistros(
    "Permisos de clientes por aspecto",
    () =>
      prisma.permisoClienteAspecto.deleteMany()
  );
  await eliminarRegistros(
    "Categorías asignadas a profesionales",
    () =>
      prisma.empresaProfesionalCategoriaGestion.deleteMany()
  );
  await eliminarRegistros(
    "Asignaciones empresa-profesional",
    () =>
      prisma.empresaProfesional.deleteMany()
  );
  await eliminarRegistros(
    "Perfiles profesionales",
    () => prisma.profesional.deleteMany()
  );
  await eliminarRegistros(
    "Usuarios",
    () => prisma.usuario.deleteMany()
  );
  await eliminarRegistros(
    "Empresas",
    () => prisma.empresa.deleteMany()
  );
}

