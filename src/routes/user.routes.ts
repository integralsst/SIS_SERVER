import { Router } from "express";
import { RolUsuario } from "@prisma/client";

import {
  controladorUsuario,
} from "../controllers/user.controller";

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
  controladorUsuario.obtenerTodos
);

router.get(
  "/:id",
  autenticar,
  autorizar(...rolesGestionUsuarios),
  controladorUsuario.obtenerPorId
);

router.post(
  "/",
  autenticar,
  autorizar(...rolesGestionUsuarios),
  controladorUsuario.crear
);

router.put(
  "/:id",
  autenticar,
  autorizar(...rolesGestionUsuarios),
  controladorUsuario.actualizar
);

router.delete(
  "/:id",
  autenticar,
  autorizar(...rolesGestionUsuarios),
  controladorUsuario.eliminar
);

export default router;
