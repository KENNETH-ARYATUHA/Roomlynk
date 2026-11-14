// One shared database connection for the whole server.
// Creating a new PrismaClient per request would exhaust connections.

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
