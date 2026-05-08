const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2];
const outputPath =
  process.argv[3] || inputPath.replace(".json", ".transformed.json");

if (!inputPath) {
  console.error(
    "Usage: node transform-performance-events.js <input.json> [output.json]",
  );
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

const transformed = data.map((event) => {
  if (typeof event.params !== "string") return event;

  const paramString = event.params.startsWith("?")
    ? event.params.slice(1)
    : event.params;
  const params = Object.fromEntries(new URLSearchParams(paramString));

  return { ...event, params };
});

fs.writeFileSync(outputPath, JSON.stringify(transformed, null, 2));
console.log(`Transformed ${transformed.length} events -> ${outputPath}`);
