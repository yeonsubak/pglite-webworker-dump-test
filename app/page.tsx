"use client";

import { BackupService } from "@/lib/backup-service";
import { PGliteAppWorker } from "@/lib/pglite-app-worker";
import { Repl } from "@electric-sql/pglite-repl";
import { useEffect, useState } from "react";
import { fetchDump } from "./server/dump";

export default function Home() {
  const [worker, setWorker] = useState<PGliteAppWorker | null>(null);

  useEffect(() => {
    async function initWorker() {
      const worker = PGliteAppWorker.getInstance();

      if (localStorage.getItem("pglite.init") !== "true") {
        // Import SQL dump
        const { schema, data } = await fetchDump();
        try {
          const schemaInsert = await worker.exec(schema);
          const dataInsert = await worker.exec(data);
        } catch (err) {
          console.error(err);
        }

        localStorage.setItem("pglite.init", "true");
      }

      setWorker(worker);
    }

    initWorker();
  }, []);

  async function dumpData() {
    if (!worker) throw new Error("worker is undefined");

    const backupService = new BackupService(worker);
    const { baseFileName, dump, size } = await backupService.createDump(false);
    console.log(`Dump completed. Size: ${size}`);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <button
        type="button"
        onClick={dumpData}
        className="p-4 w-[80px] cursor-pointer border"
      >
        Dump data
      </button>
      {worker && <Repl pg={worker} />}
    </div>
  );
}
