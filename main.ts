// Packager and pre-flight validator for The Golden Ladle (Node 22+, standard library only).
// Validates game assets, local index.html references, shots.json manifest, and screenshots/
// before copying game/ + screenshots/ into MAKEFUN_OUTPUT_DIR (default /output) and building dossier.json.

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildDossier,
  htmlFacts,
  isRelativeRef,
  isRelativeSpecifier,
  resolveGamePath,
  sourceImports,
  type DossierCaps,
} from './vendor/makefun-game.ts';

interface ShotSpec {
  name: string;
  query: string;
}

interface PreflightReport {
  shotFiles: string[];
  checkedLocalRefs: number;
  checkedModules: number;
}

const MIN_SCREENSHOTS = 3;
const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 262_144;

const DOSSIER_CAPS: DossierCaps = {
  text_max_bytes: 163_840,
  screenshots: { max: MAX_SCREENSHOTS, max_bytes: MAX_SCREENSHOT_BYTES },
  game_max_files: 993,
  game_max_bytes: 50_331_648,
  game_path_max_bytes: 1000,
};

function failPreflight(reason: string): never {
  throw new Error(`[preflight] ${reason}`);
}

function assertRegularFile(fullPath: string, displayPath: string): number {
  if (!existsSync(fullPath)) failPreflight(`missing required file: ${displayPath}`);
  const st = lstatSync(fullPath);
  if (!st.isFile()) failPreflight(`expected a regular file at ${displayPath}`);
  return st.size;
}

/** Verify game/index.html exists, references only local files that exist under game/, and its JS module graph resolves. */
function verifyGameTree(gameDir: string): { checkedLocalRefs: number; checkedModules: number } {
  if (!existsSync(gameDir) || !lstatSync(gameDir).isDirectory()) {
    failPreflight('game/ directory is missing');
  }
  const indexPath = join(gameDir, 'index.html');
  assertRegularFile(indexPath, 'game/index.html');

  const html = readFileSync(indexPath, 'utf8');
  const facts = htmlFacts(html);

  const refs: Array<{ label: string; value: string }> = [];
  for (const script of facts.scripts) {
    if (script.src !== null) refs.push({ label: `<script src="${script.src}">`, value: script.src });
  }
  for (const link of facts.links) {
    refs.push({ label: `<link href="${link.href}">`, value: link.href });
  }
  for (const resource of facts.resources) {
    refs.push({ label: `<${resource.tag} src="${resource.src}">`, value: resource.src });
  }

  const moduleQueue: string[] = [];
  for (const ref of refs) {
    if (!isRelativeRef(ref.value)) {
      failPreflight(`game/index.html contains non-local reference ${ref.label}`);
    }
    const resolved = resolveGamePath(ref.value, 'index.html');
    if (resolved === null) {
      failPreflight(`game/index.html reference escapes game/: ${ref.label}`);
    }
    assertRegularFile(join(gameDir, resolved), `game/${resolved}`);
    if (/\.(?:js|mjs)$/i.test(resolved)) {
      moduleQueue.push(resolved);
    }
  }

  const visited = new Set<string>();
  while (moduleQueue.length > 0) {
    const modPath = moduleQueue.pop()!;
    if (visited.has(modPath)) continue;
    visited.add(modPath);

    const source = readFileSync(join(gameDir, modPath), 'utf8');
    for (const spec of sourceImports(source)) {
      if (!isRelativeSpecifier(spec)) {
        failPreflight(`game/${modPath} imports non-relative specifier "${spec}"`);
      }
      const target = resolveGamePath(spec, modPath);
      if (target === null) {
        failPreflight(`game/${modPath} import "${spec}" escapes game/`);
      }
      assertRegularFile(join(gameDir, target), `game/${target}`);
      if (/\.(?:js|mjs)$/i.test(target) && !visited.has(target)) {
        moduleQueue.push(target);
      }
    }
  }

  return { checkedLocalRefs: refs.length, checkedModules: visited.size };
}

/** Parse shots.json and verify every listed filename matches a valid 3-4 screenshot set on disk. */
function verifyShotsAndScreenshots(rootDir: string): string[] {
  const shotsManifestPath = join(rootDir, 'shots.json');
  assertRegularFile(shotsManifestPath, 'shots.json');

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(shotsManifestPath, 'utf8'));
  } catch (err) {
    failPreflight(`shots.json is not valid JSON: ${(err as Error).message}`);
  }

  if (!Array.isArray(parsed) || parsed.length < MIN_SCREENSHOTS || parsed.length > MAX_SCREENSHOTS) {
    failPreflight(`shots.json must be an array of ${MIN_SCREENSHOTS}-${MAX_SCREENSHOTS} shot entries`);
  }

  const manifestNames: string[] = [];
  const manifestSet = new Set<string>();
  for (let i = 0; i < parsed.length; i += 1) {
    const entry = parsed[i] as Partial<ShotSpec> | null;
    if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string' || typeof entry.query !== 'string') {
      failPreflight(`shots.json[${i}] must have string "name" and "query" fields`);
    }
    const name = entry.name.trim();
    if (name.length === 0 || name.includes('/') || name.includes('\\')) {
      failPreflight(`shots.json[${i}].name "${entry.name}" is not a valid filename`);
    }
    if (manifestSet.has(name)) {
      failPreflight(`shots.json lists duplicate screenshot name "${name}"`);
    }
    manifestSet.add(name);
    manifestNames.push(name);
  }

  const shotsDir = join(rootDir, 'screenshots');
  if (!existsSync(shotsDir) || !lstatSync(shotsDir).isDirectory()) {
    failPreflight('screenshots/ directory is missing');
  }

  const diskNames = readdirSync(shotsDir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .map((entry) => {
      if (!entry.isFile()) failPreflight(`screenshots/${entry.name} must be a regular file`);
      return entry.name;
    })
    .sort();

  if (diskNames.length < MIN_SCREENSHOTS || diskNames.length > MAX_SCREENSHOTS) {
    failPreflight(`screenshots/ must contain ${MIN_SCREENSHOTS}-${MAX_SCREENSHOTS} files, found ${diskNames.length}`);
  }

  for (const fileName of diskNames) {
    const size = assertRegularFile(join(shotsDir, fileName), `screenshots/${fileName}`);
    if (size === 0) failPreflight(`screenshots/${fileName} is empty`);
    if (size > MAX_SCREENSHOT_BYTES) {
      failPreflight(`screenshots/${fileName} is ${size} bytes, exceeding the ${MAX_SCREENSHOT_BYTES}-byte limit`);
    }
  }

  const expectedSorted = [...manifestNames].sort();
  if (
    expectedSorted.length !== diskNames.length ||
    expectedSorted.some((name, idx) => name !== diskNames[idx])
  ) {
    failPreflight(
      `shots.json entries [${expectedSorted.join(', ')}] do not match screenshots/ on disk [${diskNames.join(', ')}]`,
    );
  }

  return diskNames;
}

function runPreflight(rootDir: string): PreflightReport {
  const gameCheck = verifyGameTree(join(rootDir, 'game'));
  const shotFiles = verifyShotsAndScreenshots(rootDir);
  return {
    shotFiles,
    checkedLocalRefs: gameCheck.checkedLocalRefs,
    checkedModules: gameCheck.checkedModules,
  };
}

function packageEntry(rootDir: string, outDir: string): number {
  mkdirSync(outDir, { recursive: true });

  const destGame = join(outDir, 'game');
  const destShots = join(outDir, 'screenshots');
  rmSync(destGame, { recursive: true, force: true });
  rmSync(destShots, { recursive: true, force: true });

  cpSync(join(rootDir, 'game'), destGame, { recursive: true });
  cpSync(join(rootDir, 'screenshots'), destShots, { recursive: true });

  const dossierBytes = buildDossier(outDir, DOSSIER_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossierBytes);
  return dossierBytes.length;
}

function main(): void {
  const rootDir = fileURLToPath(new URL('.', import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  const report = runPreflight(rootDir);
  const dossierSize = packageEntry(rootDir, outDir);

  console.log(
    `Packaged The Golden Ladle to ${outDir} (${report.checkedLocalRefs} HTML refs, ${report.checkedModules} JS modules, ${report.shotFiles.length} screenshots, dossier.json ${dossierSize} bytes)`,
  );
}

main();
