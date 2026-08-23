import { Router } from "express";
import { RolUsuario } from "@prisma/client";

import {
  controladorUsuarioRolesProfesionales,
} from "../controllers/user-professional-role.controller";

import {
  authenticate as autenticar,
  authorize as autorizar,
} from "../middlewares/auth.middleware";

const router = Router();

const rolesGestionUsuarios = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.ADMIN_CLIENTE,
];

router.get(
  "/",
  autenticar,
  autorizar(...rolesGestionUsuarios),
  controladorUsuarioRolesProfesionales.obtenerTodos
);

router.get(
  "/:id",
  autenticar,
  autorizar(...rolesGestionUsuarios),
  controladorUsuarioRolesProfesionales.obtenerPorId
);

router.post(
  "/",
  autenticar,
  autorizar(...rolesGestionUsuarios),
  controladorUsuarioRolesProfesionales.crear
);

router.put(
  "/:id",
  autenticar,
  autorizar(...rolesGestionUsuarios),
  controladorUsuarioRolesProfesionales.actualizar
);

router.delete(
  "/:id",
  autenticar,
  autorizar(...rolesGestionUsuarios),
  controladorUsuarioRolesProfesionales.eliminar
);

export default router;
