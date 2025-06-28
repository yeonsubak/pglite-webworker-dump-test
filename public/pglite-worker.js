import { IdbFs, PGlite } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";
import { worker } from "@electric-sql/pglite/worker";

worker({
  async init() {
    return new PGlite({
      fs: new IdbFs("pglite-webworker-dump-test"),
      relaxedDurability: true,
      extensions: { live },
    });
  },
});
