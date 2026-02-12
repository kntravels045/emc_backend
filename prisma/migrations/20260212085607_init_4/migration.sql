/*
  Warnings:

  - Made the column `storyOrTopic` on table `PodcastFormSubmission` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PodcastFormSubmission" ALTER COLUMN "phoneNumber" DROP NOT NULL,
ALTER COLUMN "storyOrTopic" SET NOT NULL;
