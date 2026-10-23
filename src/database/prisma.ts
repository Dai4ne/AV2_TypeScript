import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Prisma Client usa a URL configurada para se conectar ao PostgreSQL.
export const prisma = new PrismaClient();