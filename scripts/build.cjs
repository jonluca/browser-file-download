// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");
const esbuild = require("esbuild");
let options = {
  entryPoints: [path.join(__dirname, "../src/index.ts")],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: "dist/mjs/index.js",
  format: "esm",
};

const targets = {
  modern: { target: "es2022" },
  default: { target: ["chrome79"] },
  legacy: {
    target: "es6",
  },
};

const builds = Object.entries(targets).flatMap(([name, target]) => {
  const suffix = name === "default" ? "" : `.${name}`;
  const esmBuild = esbuild.build({ ...options, outfile: `dist/mjs/index${suffix}.js`, ...target });
  const cjsBuild = esbuild.build({ ...options, outfile: `dist/cjs/index${suffix}.js`, ...target, format: "cjs" });
  return [esmBuild, cjsBuild];
});

Promise.all(builds)
  .then(() => {
    const mjsPackage = path.join(__dirname, "../dist/mjs/package.json");
    const cjsPackage = path.join(__dirname, "../dist/cjs/package.json");
    try {
      fs.writeFileSync(mjsPackage, JSON.stringify({ type: "module" }, null, 2));
      fs.writeFileSync(cjsPackage, JSON.stringify({ type: "commonjs" }, null, 2));
    } catch (e) {
      console.error(e);
    }
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
