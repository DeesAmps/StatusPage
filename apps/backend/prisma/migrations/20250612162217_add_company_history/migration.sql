-- CreateTable
CREATE TABLE "CompanyHistory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "incidentTitle" TEXT,
    "incidentSummary" TEXT,
    "incidentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CompanyHistory" ADD CONSTRAINT "CompanyHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
