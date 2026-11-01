/*
 * Copy the brand kit into a HyperFrames project as <project>/brand/.
 * Usage: node shared/brand/hyperframes/install.js <project_dir> [--starter]
 *
 * The copy is needed because HyperFrames serves only its project folder, so a relative
 * path climbing back up to shared/ would be missing at render time. Rerun after a kit
 * change; never edit the copy. --starter also writes index.html if none exists.
 */
const fs = require("fs");
const path = require("path");

const brandDir = path.join(__dirname, "..");
const [projectArgument, ...flags] = process.argv.slice(2);
if (!projectArgument) {
  console.error("Usage: node install.js <project_dir> [--starter]");
  process.exit(1);
}
const projectDir = path.resolve(projectArgument);
const kitDir = path.join(projectDir, "brand");

const ENTRIES = [
  "tokens.json",
  "brand.css",
  "brand-kit.js",
  "fonts",
  "paper",
  "torn",
  "vendor",
  "logo",
  path.join("stickman", "stickman.js"),
];

fs.mkdirSync(kitDir, { recursive: true });
for (const entry of ENTRIES) {
  const target = path.join(kitDir, entry);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(path.join(brandDir, entry), target, { recursive: true });
}

const indexPath = path.join(projectDir, "index.html");
if (flags.includes("--starter") && !fs.existsSync(indexPath)) {
  fs.copyFileSync(path.join(__dirname, "starter.html"), indexPath);
  console.log(`wrote ${indexPath}`);
}
console.log(`brand kit copied to ${kitDir}`);
