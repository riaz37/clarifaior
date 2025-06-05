import { PrismaClient } from '../generated/prisma';

// Singleton to prevent multiple instances in development
let prismaClient: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }
  return prismaClient;
}