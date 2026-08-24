import "dotenv/config";

import {
  PrismaClient,
  RolUsuario,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function obtenerVariableObligatoria(
  nombre: string
): string {
  const valor = process.env[nombre]?.trim();

  if (!valor) {
    throw new Error(
      `La variable de entorno ${nombre} es obligatoria.`
    );
  }

  return valor;
}

function normalizarCorreo(
  valor: string
): string {
  return valor.trim().toLowerCase();
}

async function main(): Promise<void> {
  console.log("");
  console.log(
    "🌱 Preparando SUPERADMIN productivo de Stack44..."
  );

  const nombre = obtenerVariableObligatoria(
    "BOOTSTRAP_SUPERADMIN_NOMBRE"
  );
  const correo = normalizarCorreo(
    obtenerVariableObligatoria(
      "BOOTSTRAP_SUPERADMIN_CORREO"
    )
  );
  const contrasena = obtenerVariableObligatoria(
    "BOOTSTRAP_SUPERADMIN_CONTRASENA"
  );

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      correo
    )
  ) {
    throw new Error(
      "BOOTSTRAP_SUPERADMIN_CORREO no contiene un correo válido."
    );
  }

  if (contrasena.length < 8) {
    throw new Error(
      "BOOTSTRAP_SUPERADMIN_CONTRASENA debe tener mínimo 8 caracteres."
    );
  }

  const existente =
    await prisma.usuario.findUnique({
      where: {
        correo,
      },
      select: {
        id: true,
        rol: true,
      },
    });

  if (
    existente &&
    existente.rol !== RolUsuario.SUPERADMIN
  ) {
    throw new Error(
      "Ya existe un usuario con ese correo y no es SUPERADMIN. No se elevará su rol automáticamente."
    );
  }

  const contrasenaEncriptada =
    await bcrypt.hash(contrasena, 12);

  const usuario = existente
    ? await prisma.usuario.update({
        where: {
          id: existente.id,
        },
        data: {
          nombre,
          contrasena: contrasenaEncriptada,
          rol: RolUsuario.SUPERADMIN,
          empresaId: null,
          activo: true,
        },
        select: {
          id: true,
          nombre: true,
          correo: true,
          rol: true,
          empresaId: true,
          activo: true,
        },
      })
    : await prisma.usuario.create({
        data: {
          nombre,
          correo,
          contrasena: contrasenaEncriptada,
          rol: RolUsuario.SUPERADMIN,
          empresaId: null,
          activo: true,
        },
        select: {
          id: true,
          nombre: true,
          correo: true,
          rol: true,
          empresaId: true,
          activo: true,
        },
      });

  console.log("");
  console.log(
    existente
      ? "✅ SUPERADMIN productivo actualizado."
      : "✅ SUPERADMIN productivo creado."
  );
  console.table([
    {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      empresaId: usuario.empresaId ?? "-",
      activo: usuario.activo,
    },
  ]);
  console.log("");
  console.log(
    "ℹ️ La contraseña no se imprime ni se almacena en texto plano."
  );
  console.log(
    "ℹ️ Este seed no crea empresas, profesionales, coordinadores ni datos demo."
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "❌ Error ejecutando el seed productivo de SUPERADMIN:",
      error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
