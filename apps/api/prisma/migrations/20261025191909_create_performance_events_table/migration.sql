-- CreateTable
CREATE TABLE "performance_events" (
    "id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "params" JSONB,
    "duration" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_events_pkey" PRIMARY KEY ("id")
);
