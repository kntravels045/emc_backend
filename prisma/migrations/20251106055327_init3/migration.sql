/*
  Warnings:

  - You are about to drop the column `thumbnail` on the `Short` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Short` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Short" DROP COLUMN "thumbnail",
DROP COLUMN "title";
