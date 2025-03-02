// Code copied from [Rome](https://github.com/rome/tools/blob/main/npm/rome/scripts/generate-packages.mjs)

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";

const BIN_NAME = "oxlint";
const OXLINT_ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const PACKAGES_ROOT = resolve(OXLINT_ROOT, "..");
const REPO_ROOT = resolve(PACKAGES_ROOT, "..");
const MANIFEST_PATH = resolve(OXLINT_ROOT, "package.json");

const rootManifest = JSON.parse(
  fs.readFileSync(MANIFEST_PATH).toString("utf-8")
);

const LIBC_MAPPING = {
  "gnu": "glibc",
  "musl": "musl",
}

function generateNativePackage(target) {
  const packageName = `@${BIN_NAME}/${target}`;
  const packageRoot = resolve(PACKAGES_ROOT, `${BIN_NAME}-${target}`);

  // Remove the directory just in case it already exists (it's autogenerated
  // so there shouldn't be anything important there anyway)
  fs.rmSync(packageRoot, { recursive: true, force: true });

  // Create the package directory
  console.log(`Create directory ${packageRoot}`);
  fs.mkdirSync(packageRoot);

  // Generate the package.json manifest
  const { version, author, license, homepage, bugs, repository } = rootManifest;

  const triple = target.split("-");
  const platform = triple[0];
  const arch = triple[1];
  const libc = triple[2] && { libc: [LIBC_MAPPING[triple[2]]] }
  const manifest = JSON.stringify({
    name: packageName,
    version,
    author,
    license,
    homepage,
    bugs,
    repository,
    os: [platform],
    cpu: [arch],
    ...libc
  });

  const manifestPath = resolve(packageRoot, "package.json");
  console.log(`Create manifest ${manifestPath}`);
  fs.writeFileSync(manifestPath, manifest);

  // Copy the binary
  const ext = platform === "win32" ? ".exe" : "";
  const binarySource = resolve(REPO_ROOT, `${BIN_NAME}-${target}${ext}`);
  const binaryTarget = resolve(packageRoot, `${BIN_NAME}${ext}`);

  console.log(`Copy binary ${binaryTarget}`);
  fs.copyFileSync(binarySource, binaryTarget);
  fs.chmodSync(binaryTarget, 0o755);
}

function writeManifest() {
  const manifestPath = resolve(PACKAGES_ROOT, BIN_NAME, "package.json");

  const manifestData = JSON.parse(
    fs.readFileSync(manifestPath).toString("utf-8")
  );

  const nativePackages = TARGETS.map((target) => [
    `@${BIN_NAME}/${target}`,
    rootManifest.version,
  ]);

  manifestData["version"] = rootManifest.version;
  manifestData["optionalDependencies"] = Object.fromEntries(nativePackages);

  console.log(`Update manifest ${manifestPath}`);
  const content = JSON.stringify(manifestData);
  fs.writeFileSync(manifestPath, content);
}

// NOTE: Must update npm/oxlint/bin/oxlint
const TARGETS = [
  "win32-x64",
  "win32-arm64",
  "linux-x64-gnu",
  "linux-arm64-gnu",
  "linux-x64-musl",
  "linux-arm64-musl",
  "darwin-x64",
  "darwin-arm64",
]

for (const target of TARGETS) {
    generateNativePackage(target);
}

writeManifest();
