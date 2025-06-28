"use server";

import { promises as fs } from "fs";

export async function fetchDump() {
  const basePath = `${process.cwd()}/lib`;
  const schema = await fs.readFile(`${basePath}/pagila-schema.sql`, "utf-8");
  const data = await fs.readFile(`${basePath}/pagila-insert-data.sql`, "utf-8");
  return {
    schema,
    data,
  };
}
