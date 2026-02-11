-- CreateTable
CREATE TABLE "PodcastFormSubmission" (
    "submissionId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "linkedInPortfolio" TEXT,
    "connectionPreference" TEXT NOT NULL,
    "storyOrTopic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PodcastFormSubmission_pkey" PRIMARY KEY ("submissionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "PodcastFormSubmission_submissionId_key" ON "PodcastFormSubmission"("submissionId");
