import { RolUsuario } from "@prisma/client";

export function esRolConPerfilProfesional(
  rol: RolUsuario
): boolean {
  return (
    rol === RolUsuario.PROFESIONAL ||
    rol === RolUsuario.COORDINADOR
  );
}
