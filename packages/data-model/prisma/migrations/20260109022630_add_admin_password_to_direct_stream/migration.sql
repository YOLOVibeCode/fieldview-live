/*
  Warnings:

  - Added the required column `adminPassword` to the `DirectStream` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Add column with temporary default (bcrypt hash of "admin2026")
ALTER TABLE "DirectStream" ADD COLUMN "adminPassword" TEXT NOT NULL DEFAULT '$2b$10$rX8VKjHc5YP4Y5nN0Z3zXuQGk7yN8vZ3mJ6xH4eR5tQ8wS9pK7.9m';

-- Remove default so future inserts must provide password
ALTER TABLE "DirectStream" ALTER COLUMN "adminPassword" DROP DEFAULT;
