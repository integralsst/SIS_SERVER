import {
  RolUsuario,
} from "@prisma/client";
import {
  Router,
} from "express";

import { controladorCatalogosSupermatriz } from "../controllers/supermatriz/catalogos-supermatriz.controller";
import { controladorConstruccionSupermatriz } from "../controllers/supermatriz/construccion-supermatriz.controller";
import { controladorHistorialSupermatriz } from "../controllers/supermatriz/historial-supermatriz.controller";
import { controladorTareasSupermatriz } from "../controllers/supermatriz/tareas-supermatriz.controller";
import { controladorVersionesSupermatriz } from "../controllers/supermatriz/versiones-supermatriz.controller";
import {
  authenticate as autenticar,
  authorize as autorizar,
} from "../middlewares/auth.middleware";

const router = Router();

const rolesLectura = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
  RolUsuario.PROFESIONAL,
];

const rolesEdicion = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

router.use(autenticar);

// ======================================================
// CATÁLOGOS Y RESUMEN
// ======================================================

router.get(
  "/catalogos",
  autorizar(...rolesLectura),
  controladorCatalogosSupermatriz.obtenerTodos
);

router.get(
  "/resumen",
  autorizar(...rolesLectura),
  controladorCatalogosSupermatriz.obtenerResumen
);

// ======================================================
// VERSIONES
// ======================================================

router.get(
  "/versiones",
  autorizar(...rolesLectura),
  controladorVersionesSupermatriz.obtenerTodas
);

router.get(
  "/versiones/:id",
  autorizar(...rolesLectura),
  controladorVersionesSupermatriz.obtenerPorId
);

router.post(
  "/versiones",
  autorizar(...rolesEdicion),
  controladorVersionesSupermatriz.crear
);

router.put(
  "/versiones/:id",
  autorizar(...rolesEdicion),
  controladorVersionesSupermatriz.actualizar
);

router.post(
  "/versiones/:id/clonar",
  autorizar(...rolesEdicion),
  controladorVersionesSupermatriz.clonar
);

router.post(
  "/versiones/:id/publicar",
  autorizar(...rolesEdicion),
  controladorVersionesSupermatriz.publicar
);

// Las versiones no se cierran manualmente.
// La versión vigente pasa a histórica de forma automática
// al publicar su sucesora con una nueva fecha de vigencia.

// ======================================================
// CONSTRUCTOR TRANSACCIONAL EN ORDEN INVERSO
// ======================================================

router.post(
  "/construir-fila",
  autorizar(...rolesEdicion),
  controladorConstruccionSupermatriz.guardar
);

// ======================================================
// CRUD DE ESTRUCTURA MAESTRA
// ======================================================

router.post(
  "/ciclos-phva",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.crearCiclo
);

router.put(
  "/ciclos-phva/:id",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.actualizarCiclo
);

router.delete(
  "/ciclos-phva/:id",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.desactivarCiclo
);

router.post(
  "/categorias-estandar",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.crearCategoria
);

router.put(
  "/categorias-estandar/:id",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.actualizarCategoria
);

router.delete(
  "/categorias-estandar/:id",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.desactivarCategoria
);

router.post(
  "/estandares",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.crearEstandar
);

router.put(
  "/estandares/:id",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.actualizarEstandar
);

router.delete(
  "/estandares/:id",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.desactivarEstandar
);

router.post(
  "/aspectos",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.crearAspecto
);

router.put(
  "/aspectos/:id",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.actualizarAspecto
);

router.delete(
  "/aspectos/:id",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.desactivarAspecto
);

router.post(
  "/procesos",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.crearProceso
);

router.put(
  "/procesos/:id",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.actualizarProceso
);

router.delete(
  "/procesos/:id",
  autorizar(...rolesEdicion),
  controladorCatalogosSupermatriz.desactivarProceso
);

// ======================================================
// FILAS DE LA MATRIZ
// ======================================================

router.get(
  "/tareas",
  autorizar(...rolesLectura),
  controladorTareasSupermatriz.obtenerTodas
);

router.get(
  "/tareas/:id",
  autorizar(...rolesLectura),
  controladorTareasSupermatriz.obtenerPorId
);

router.post(
  "/tareas",
  autorizar(...rolesEdicion),
  controladorTareasSupermatriz.crear
);

router.put(
  "/tareas/:id",
  autorizar(...rolesEdicion),
  controladorTareasSupermatriz.actualizar
);

router.delete(
  "/tareas/:id",
  autorizar(...rolesEdicion),
  controladorTareasSupermatriz.eliminar
);

// ======================================================
// HISTORIAL
// ======================================================

router.get(
  "/historial",
  autorizar(...rolesLectura),
  controladorHistorialSupermatriz.obtenerTodos
);

export default router;
