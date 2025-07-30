import chalk from "chalk";
import ora from "ora";
import semver from "semver";
import {
  loadSpreadConfig,
  ensureSpreadOutputDir,
  readFileContent,
  generateTargetPath,
  loadRegistry,
  saveRegistry,
} from "../utils/index.js";
import { SpreadItem, GeneratedSpread, SpreadFile } from "../types/index.js";
import fs from "fs-extra";
import path from "node:path";

export async function buildCommand(): Promise<void> {
  const spinner = ora("Loading spread configuration...").start();

  try {
    const config = await loadSpreadConfig();

    if (!config) {
      spinner.fail("No spread.json found. Run `spread init` to create one.");
      return;
    }

    spinner.text = "Ensuring output directory...";
    const outputDir = await ensureSpreadOutputDir();

    spinner.text = "Loading existing app spreads...";
    const registry = await loadRegistry();

    for (const item of config.items) {
      spinner.text = `Building ${item.name}@${item.version || "0.0.0"}...`;

      try {
        await buildSpreadItem(
          item,
          outputDir,
          config.homepage || "http://localhost:3000"
        );

        const spreadName = item.name;
        const version = item.version || "0.0.0";
        const homepage = config.homepage || "http://localhost:3000";
        const spreadUrl = `${homepage}/spread/${spreadName}`;

        if (!registry.spreads[spreadName]) {
          registry.spreads[spreadName] = {
            spread: spreadUrl,
            versions: [],
          };
        }

        registry.spreads[spreadName].spread = spreadUrl;

        if (!registry.spreads[spreadName].versions.includes(version)) {
          registry.spreads[spreadName].versions.push(version);
          registry.spreads[spreadName].versions.sort((a, b) =>
            semver.compare(a, b)
          );
        }
      } catch (error) {
        spinner.fail(`Failed to build ${item.name}: ${error}`);
        return;
      }
    }

    spinner.text = "Saving registry...";
    await saveRegistry(registry);

    spinner.succeed(
      chalk.green(`Successfully built ${config.items.length} spread(s)`)
    );
  } catch (error) {
    spinner.fail(`Build failed: ${error}`);
  }
}

async function buildSpreadItem(
  item: SpreadItem,
  outputDir: string,
  homepage: string
): Promise<void> {
  const version = item.version || "0.0.0";
  const fileName = `${item.name}@${version}.json`;
  const filePath = path.join(outputDir, fileName);

  const processedFiles: SpreadFile[] = [];

  for (const file of item.files) {
    const processedFile: SpreadFile = {
      path: file.path,
      absolute: file.absolute,
      target:
        file.target ||
        generateTargetPath(item.name, file.path || file.absolute || ""),
    };

    if (file.path) {
      try {
        processedFile.content = await readFileContent(file.path);
      } catch (error) {
        throw new Error(`Failed to read file ${file.path}: ${error}`);
      }
    } else if (file.absolute) {
    }

    processedFiles.push(processedFile);
  }

  const resolvedSpreadDependencies = resolvePartialUrlsInDependencies(
    item.spreadDependencies,
    homepage
  );

  const generatedSpread: GeneratedSpread = {
    $schema: "https://spread.neploom.com/schema/spread.json",
    name: item.name,
    description: item.description,
    type: item.type || "component",
    version: version,
    keywords: item.keywords,
    spreadDependencies: resolvedSpreadDependencies,
    dependencies: item.dependencies,
    devDependencies: item.devDependencies,
    files: processedFiles,
  };

  await fs.writeJson(filePath, generatedSpread, { spaces: 2 });
}

function resolvePartialUrlsInDependencies(
  spreadDependencies: { [key: string]: string } | undefined,
  homepage: string
): { [key: string]: string } | undefined {
  if (!spreadDependencies) return undefined;

  const resolved: { [key: string]: string } = {};

  for (const [key, version] of Object.entries(spreadDependencies)) {
    if (key.startsWith("/")) {
      resolved[`${homepage}${key}`] = version;
    } else {
      resolved[key] = version;
    }
  }

  return resolved;
}
