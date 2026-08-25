-- 5G-A: identidad histórica transversal de los aspectos.
ALTER TABLE `Aspecto`
  ADD COLUMN `identidadHistorica` VARCHAR(36) NULL;

-- La migración rellena primero cada aspecto existente con una identidad propia.
UPDATE `Aspecto`
SET `identidadHistorica` = UUID()
WHERE `identidadHistorica` IS NULL;

ALTER TABLE `Aspecto`
  MODIFY `identidadHistorica` VARCHAR(36) NOT NULL;

CREATE INDEX `Aspecto_identidadHistorica_idx`
  ON `Aspecto`(`identidadHistorica`);

CREATE UNIQUE INDEX `uq_aspecto_version_identidad_historica`
  ON `Aspecto`(`versionSupermatrizId`, `identidadHistorica`);
