/*
  Warnings:

  - You are about to drop the column `user_id` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Guest` table. All the data in the column will be lost.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `user_id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Episode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubCategory` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Blog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Guest` table without a default value. This is not possible if the table is not empty.
  - The required column `userId` was added to the `User` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "public"."Blog" DROP CONSTRAINT "Blog_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Category" DROP CONSTRAINT "Category_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Episode" DROP CONSTRAINT "Episode_subCategory_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Guest" DROP CONSTRAINT "Guest_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."SubCategory" DROP CONSTRAINT "SubCategory_category_id_fkey";

-- DropIndex
DROP INDEX "public"."User_user_id_key";

-- AlterTable
ALTER TABLE "Blog" DROP COLUMN "user_id",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Guest" DROP COLUMN "user_id",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "user_id",
ADD COLUMN     "userId" TEXT NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("userId");

-- DropTable
DROP TABLE "public"."Category";

-- DropTable
DROP TABLE "public"."Episode";

-- DropTable
DROP TABLE "public"."SubCategory";

-- CreateTable
CREATE TABLE "VideoCategory" (
    "videoCategoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "VideoCategory_pkey" PRIMARY KEY ("videoCategoryId")
);

-- CreateTable
CREATE TABLE "ShortCategory" (
    "shortCategoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ShortCategory_pkey" PRIMARY KEY ("shortCategoryId")
);

-- CreateTable
CREATE TABLE "Video" (
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "hostName" TEXT,
    "episodeNumber" TEXT,
    "hostVideoLink" TEXT NOT NULL,
    "videoCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("videoId")
);

-- CreateTable
CREATE TABLE "Short" (
    "shortId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnail" TEXT,
    "videoLink" TEXT NOT NULL,
    "shortCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Short_pkey" PRIMARY KEY ("shortId")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoCategory_videoCategoryId_key" ON "VideoCategory"("videoCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortCategory_shortCategoryId_key" ON "ShortCategory"("shortCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_videoId_key" ON "Video"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "Short_shortId_key" ON "Short"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");

-- AddForeignKey
ALTER TABLE "VideoCategory" ADD CONSTRAINT "VideoCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortCategory" ADD CONSTRAINT "ShortCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_videoCategoryId_fkey" FOREIGN KEY ("videoCategoryId") REFERENCES "VideoCategory"("videoCategoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Short" ADD CONSTRAINT "Short_shortCategoryId_fkey" FOREIGN KEY ("shortCategoryId") REFERENCES "ShortCategory"("shortCategoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
