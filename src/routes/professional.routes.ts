import { Router } from "express";
import { RolUsuario } from "@prisma/client";

import {
  controladorCategoriasProfesionalEmpresa,
} from "../controllers/professional-categories.controller";
import {
  controladorProfesional,
} from "../controllers/professional.controller";

import {
  authenticate as autenticar,
  authorize as autorizar,
} from "../middlewares/auth.middleware";

const router = Router();

const rolesInternos = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

const rolesConPerfilProfesional = [
  RolUsuario.PROFESIONAL,
  RolUsuario.COORDINADOR,
];

// ======================================================
// PERFIL DEL PROFESIONAL AUTENTICADO
// ======================================================

router.get(
  "/mi-perfil",
  autenticar,
  autorizar(...rolesConPerfilProfesional),
  controladorProfesional.obtenerMiPerfil
);

// Alias temporal para el frontend anterior
router.get(
  "/me",
  autenticar,
  autorizar(...rolesConPerfilProfesional),
  controladorProfesional.obtenerMiPerfil
);

// ======================================================
// LISTADO Y CREACIÓN
// ======================================================

router.get(
  "/",
  autenticar,
  autorizar(...rolesInternos),
  controladorProfesional.obtenerTodos
);

router.post(
  "/",
  autenticar,
  autorizar(...rolesInternos),
  controladorProfesional.crear
);

// ======================================================
// ASIGNACIONES CON EMPRESAS
// ======================================================

router.post(
  "/:id/empresas",
  autenticar,
  autorizar(...rolesInternos),
  controladorProfesional.asignarEmpresa
);

router.get(
  "/:id/empresas/:empresaId/categorias",
  autenticar,
  autorizar(...rolesInternos),
  controladorCategoriasProfesionalEmpresa.obtener
);

router.put(
  "/:id/empresas/:empresaId/categorias",
  autenticar,
  autorizar(...rolesInternos),
  controladorCategoriasProfesionalEmpresa.actualizar
);

router.delete(
  "/:id/empresas/:empresaId",
  autenticar,
  autorizar(...rolesInternos),
  controladorProfesional.retirarEmpresa
);

// Alias temporales para el frontend anterior
router.post(
  "/:id/companies",
  autenticar,
  autorizar(...rolesInternos),
  controladorProfesional.asignarEmpresa
);

router.delete(
  "/:id/companies/:companyId",
  autenticar,
  autorizar(...rolesInternos),
  controladorProfesional.retirarEmpresa
);

// ======================================================
// CONSULTA, ACTUALIZACIÓN Y DESACTIVACIÓN
// ======================================================
// Estas rutas deben permanecer después de /mi-perfil y /me
// para que Express no interprete esas palabras como un ID.

router.get(
  "/:id",
  autenticar,
  controladorProfesional.obtenerPorId
);

router.put(
  "/:id",
  autenticar,
  controladorProfesional.actualizar
);

router.delete(
  "/:id",
  autenticar,
  autorizar(...rolesInternos),
  controladorProfesional.eliminar
);

export default router;
