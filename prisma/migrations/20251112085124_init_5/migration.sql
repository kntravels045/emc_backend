/*
  Warnings:

  - The primary key for the `Blog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `blogContent` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `blogImage` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `blogTitle` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `blog_id` on the `Blog` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[blogId]` on the table `Blog` will be added. If there are existing duplicate values, this will fail.
  - The required column `blogId` was added to the `Blog` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `title` to the `Blog` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Blog_blog_id_key";

-- AlterTable
ALTER TABLE "Blog" DROP CONSTRAINT "Blog_pkey",
DROP COLUMN "blogContent",
DROP COLUMN "blogImage",
DROP COLUMN "blogTitle",
DROP COLUMN "blog_id",
ADD COLUMN     "blogId" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD CONSTRAINT "Blog_pkey" PRIMARY KEY ("blogId");

-- CreateTable
CREATE TABLE "Block" (
    "blockId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT,
    "imageUrl" TEXT,
    "blogId" TEXT NOT NULL,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("blockId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockId_key" ON "Block"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "Blog_blogId_key" ON "Blog"("blogId");

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("blogId") ON DELETE RESTRICT ON UPDATE CASCADE;
