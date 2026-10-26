-- Guarda o instante corretamente, independente do fuso configurado no PostgreSQL.
ALTER TABLE "Movimentacao"
ALTER COLUMN "dataHora" TYPE TIMESTAMPTZ(3)
USING "dataHora" AT TIME ZONE 'UTC';
