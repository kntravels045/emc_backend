-- CreateTable
CREATE TABLE "User" (
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

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
    "videoLink" TEXT NOT NULL,
    "shortCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Short_pkey" PRIMARY KEY ("shortId")
);

-- CreateTable
CREATE TABLE "Guest" (
    "guest_id" TEXT NOT NULL,
    "guestImage" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestRole" TEXT NOT NULL,
    "aboutGuest" TEXT NOT NULL,
    "instagram" TEXT,
    "twitter" TEXT,
    "threads" TEXT,
    "headingOne" TEXT NOT NULL,
    "descriptionOne" TEXT NOT NULL,
    "headingTwo" TEXT NOT NULL,
    "descriptionTwo" TEXT NOT NULL,
    "headingthree" TEXT NOT NULL,
    "descriptionThree" TEXT NOT NULL,
    "youtubeLink" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("guest_id")
);

-- CreateTable
CREATE TABLE "Blog" (
    "blogId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnail" TEXT,
    "content" JSONB NOT NULL,
    "author" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("blogId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_userId_key" ON "User"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VideoCategory_videoCategoryId_key" ON "VideoCategory"("videoCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortCategory_shortCategoryId_key" ON "ShortCategory"("shortCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_videoId_key" ON "Video"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "Short_shortId_key" ON "Short"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_guest_id_key" ON "Guest"("guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "Blog_blogId_key" ON "Blog"("blogId");

-- AddForeignKey
ALTER TABLE "VideoCategory" ADD CONSTRAINT "VideoCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortCategory" ADD CONSTRAINT "ShortCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_videoCategoryId_fkey" FOREIGN KEY ("videoCategoryId") REFERENCES "VideoCategory"("videoCategoryId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Short" ADD CONSTRAINT "Short_shortCategoryId_fkey" FOREIGN KEY ("shortCategoryId") REFERENCES "ShortCategory"("shortCategoryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
