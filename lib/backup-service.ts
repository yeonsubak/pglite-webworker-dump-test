import { PGlite, type Results, type Transaction } from "@electric-sql/pglite";
import { pgDump } from "@electric-sql/pglite-tools/pg_dump";
import {
  gunzipSync,
  gzipSync,
  strFromU8,
  strToU8,
  unzip,
  zipSync,
} from "fflate";
import type { PGliteAppWorker } from "./pglite-app-worker";
import { base64ToUint8Array, uInt8ArrayToBase64 } from "./utils";

export type DumpMetaData = {
  fileName: string;
  schemaVersion: string;
  sha256: string;
  localStorageItems: Record<string, string>;
  compressed: boolean;
  timestamp: number;
};

export class BackupService {
  private pg: PGliteAppWorker;

  constructor(pg: PGliteAppWorker) {
    this.pg = pg;
  }

  public async createDump(compress: boolean): Promise<{
    dump: string;
    baseFileName: string;
    size: string;
  }> {
    const timestamp = Date.now();
    const baseFileName = `pglite-dump-${timestamp}`;

    const dumpDir = await this.pg.dumpDataDir();

    const tempPg = await PGlite.create({ loadDataDir: dumpDir });

    const dumpFile = await pgDump({
      pg: tempPg,
      fileName: `${baseFileName}.sql`,
    });
    const dump = await dumpFile.text();

    const sizeInByte = new TextEncoder().encode(dump).length;
    const sizeInKB = sizeInByte / 1024;

    return {
      dump: compress ? BackupService.compressGzipBase64(dump) : dump,
      baseFileName,
      size: `${sizeInKB.toLocaleString()}KB`,
    };
  }

  public async exportToZip(
    compressedDumpBase64: string,
    metaData: DumpMetaData,
    baseFileName: string
  ): Promise<{ fileName: string; url: string }> {
    const zipped = this.bundleToZip(compressedDumpBase64, metaData);
    const blob = new Blob([zipped], { type: "application/zip" });
    return {
      fileName: `${baseFileName}.zip`,
      url: URL.createObjectURL(blob),
    };
  }

  public static compressGzipBase64(original: string) {
    const compressed = gzipSync(strToU8(original));
    return uInt8ArrayToBase64(compressed);
  }

  public static decompressGzipBase64(compressed: string) {
    return strFromU8(gunzipSync(base64ToUint8Array(compressed)));
  }

  public static async decompressZipFile(file: File) {
    const buffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(buffer);

    const res: {
      metaData: DumpMetaData | undefined;
      dump: string | undefined;
    } = {
      metaData: undefined,
      dump: undefined,
    };

    unzip(uint8, (err, files) => {
      if (err) {
        console.error("Failed to unzip:", err);
        return;
      }

      for (const [filename, data] of Object.entries(files)) {
        if (!data) continue;
        const text = strFromU8(data);

        if (filename.endsWith(".json")) {
          res.metaData = JSON.parse(text);
        }

        if (filename.endsWith(".sql")) {
          const decompressed = this.decompressGzipBase64(text);
          res.dump = decompressed;
        }
      }
    });

    return res;
  }

  private async dropDatabase(tx: Transaction) {
    const schemaQueryResult: Results<{ schemaname: string }> = await tx.query(`
        SELECT DISTINCT schemaname
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema');
        `);
    const schemaNames = schemaQueryResult.rows.map(
      ({ schemaname }) => schemaname
    );

    const dropSchemas = async (schemaName: string) => {
      const queryString = `DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`;
      return tx.query(queryString);
      // return this.db.execute(sql.raw(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`));
    };

    const dropTypes = async () => {
      await tx.query(`
          DO
          $$
          DECLARE
              r RECORD;
          BEGIN
              FOR r IN
                  SELECT n.nspname AS schema, t.typname AS enum_name
                  FROM pg_type t
                  JOIN pg_enum e ON t.oid = e.enumtypid
                  JOIN pg_namespace n ON n.oid = t.typnamespace
                  WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
              LOOP
                  EXECUTE format('DROP TYPE IF EXISTS %I.%I CASCADE', r.schema, r.enum_name);
              END LOOP;
          END
          $$;
          `);
    };

    try {
      await Promise.all(schemaNames.map(dropSchemas));
      await dropTypes();
    } catch (err) {
      throw new Error(`${err}`);
    }
  }

  private bundleToZip(dumpContent: string, metaData: DumpMetaData) {
    const files: Record<string, Uint8Array> = {};
    files[metaData.fileName] = strToU8(dumpContent);
    files[`${metaData.fileName}-metadata.json`] = strToU8(
      JSON.stringify(metaData)
    );

    return zipSync(files, {
      level: 7,
      mtime: metaData.timestamp,
    });
  }
}
