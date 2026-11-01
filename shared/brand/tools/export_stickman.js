/* Write every pose to shared/brand/stickman/poses/ as a static SVG, in the brand palette.
 * Usage: node shared/brand/tools/export_stickman.js
 * Manim loads these through SVGMobject; design tools can open them directly. */
const fs = require("fs");
const path = require("path");
const stickman = require("../stickman/stickman.js");

const brandDir = path.join(__dirname, "..");
const tokens = JSON.parse(fs.readFileSync(path.join(brandDir, "tokens.json"), "utf8"));
const outputDir = path.join(brandDir, "stickman", "poses");
fs.mkdirSync(outputDir, { recursive: true });

const POSE_EXPRESSIONS = {
  standing: "neutral",
  pointing: "happy",
  pointing_up: "delighted",
  thinking: "thinking",
  shrugging: "confused",
  walk_contact: "neutral",
  walk_passing: "neutral",
  shocked: "shocked",
  presenting: "happy",
  cheering: "delighted",
};

for (const [pose, expression] of Object.entries(POSE_EXPRESSIONS)) {
  const svg = stickman.renderSvg({
    pose,
    expression,
    ink: tokens.color.ink,
    accent: tokens.color.accent,
  });
  fs.writeFileSync(path.join(outputDir, `${pose}.svg`), svg);
}
console.log(`wrote ${Object.keys(POSE_EXPRESSIONS).length} poses to ${outputDir}`);
