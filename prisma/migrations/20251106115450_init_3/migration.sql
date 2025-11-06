-- DropForeignKey
ALTER TABLE "public"."Video" DROP CONSTRAINT "Video_videoCategoryId_fkey";

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_videoCategoryId_fkey" FOREIGN KEY ("videoCategoryId") REFERENCES "VideoCategory"("videoCategoryId") ON DELETE CASCADE ON UPDATE CASCADE;
