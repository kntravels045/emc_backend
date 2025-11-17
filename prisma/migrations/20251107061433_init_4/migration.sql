/*
  Warnings:

  - You are about to drop the column `guestDetails` on the `Guest` table. All the data in the column will be lost.
  - Added the required column `aboutGuest` to the `Guest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descriptionOne` to the `Guest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descriptionThree` to the `Guest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descriptionTwo` to the `Guest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestRole` to the `Guest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `headingOne` to the `Guest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `headingTwo` to the `Guest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `headingthree` to the `Guest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `youtubeLink` to the `Guest` table without a default value. This is not possible if the table is not empty.
  - Made the column `guestImage` on table `Guest` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Guest" DROP COLUMN "guestDetails",
ADD COLUMN     "aboutGuest" TEXT NOT NULL,
ADD COLUMN     "descriptionOne" TEXT NOT NULL,
ADD COLUMN     "descriptionThree" TEXT NOT NULL,
ADD COLUMN     "descriptionTwo" TEXT NOT NULL,
ADD COLUMN     "guestRole" TEXT NOT NULL,
ADD COLUMN     "headingOne" TEXT NOT NULL,
ADD COLUMN     "headingTwo" TEXT NOT NULL,
ADD COLUMN     "headingthree" TEXT NOT NULL,
ADD COLUMN     "youtubeLink" TEXT NOT NULL,
ALTER COLUMN "guestImage" SET NOT NULL;
