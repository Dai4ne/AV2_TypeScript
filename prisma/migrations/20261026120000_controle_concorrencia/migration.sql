-- Versões permitem recusar atualizações feitas com dados desatualizados.
ALTER TABLE "Organizacao" ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Contrato" ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Lote" ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Equipamento" ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1;
