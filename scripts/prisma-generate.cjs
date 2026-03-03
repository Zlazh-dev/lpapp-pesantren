const { spawnSync } = require("node:child_process");

const env = { ...process.env };

// Prevent accidental Accelerate-only client generation in local/dev workflows.
delete env.PRISMA_GENERATE_NO_ENGINE;
delete env.PRISMA_GENERATE_ACCELERATE;
delete env.PRISMA_GENERATE_DATAPROXY;

const prismaCli = require.resolve("prisma/build/index.js");
const args = [prismaCli, "generate", ...process.argv.slice(2)];

const result = spawnSync(process.execPath, args, {
  stdio: "inherit",
  env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
