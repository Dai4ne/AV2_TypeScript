-- Impede que duas organizações usem o mesmo e-mail.
CREATE UNIQUE INDEX "Organizacao_email_key" ON "Organizacao"("email");
