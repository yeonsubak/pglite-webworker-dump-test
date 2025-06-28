"use client";

import { PGliteWorker } from "@electric-sql/pglite/worker";

export class PGliteAppWorker extends PGliteWorker {
  protected static instance: PGliteAppWorker | null = null;

  protected constructor() {
    const worker = new Worker(
      new URL("@/public/pglite-worker.js", import.meta.url),
      {
        type: "module",
      }
    );

    super(worker);
  }

  public static getInstance(): PGliteAppWorker {
    if (!PGliteAppWorker.instance) {
      PGliteAppWorker.instance = new PGliteAppWorker();
    }

    return PGliteAppWorker.instance;
  }
}
