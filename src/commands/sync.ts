import watch from "node-watch";
import ora from "ora";
import {
  loadSpreadConfig,
  saveSpreadConfig,
  readFileContent,
  parseFileDependencies,
} from "../utils/index.js";
import { SpreadConfig } from "../types/index.js";
import path from "node:path";
import { minimatch } from "minimatch";
import { parsePatterns } from "../utils/pattern-parser.js";

export async function syncCommand(
  patterns: string,
  options: { debounce: number; name?: string }
) {
  const spinner = ora("Starting sync...").start();

  try {
    const config = await loadSpreadConfig();
    if (!config) {
      throw new Error("spread.json not found. Run `spread init` to create one.");
    }

    const rawFilenames = patterns.split(",");
    const { include: includePatterns, exclude: initialExcludePatterns } =
      parsePatterns(rawFilenames);

    const excludePatterns = [...initialExcludePatterns, "node_modules/**"];

    const watcher = watch(process.cwd(), {
      recursive: true,
      delay: options.debounce,
      filter: (f) => {
        const relativePath = path
          .relative(process.cwd(), f)
          .replace(/\\/g, "/");

        if (relativePath === "spread.json") {
          return false;
        }

        const effectiveIncludePatterns =
          includePatterns.length > 0 ? includePatterns : ["**/*"];

        const isIncluded = effectiveIncludePatterns.some((pattern) =>
          minimatch(relativePath, pattern, { dot: true })
        );

        const isExcluded = excludePatterns.some((pattern) =>
          minimatch(relativePath, pattern, { dot: true })
        );

        const finalResult = isIncluded && !isExcluded;
        return finalResult;
      },
    });

    watcher.on("change", async (evt, name) => {
      const filePath = typeof name === "string" ? name : name.toString();
      spinner.text = `Detected ${evt} on ${filePath}. Updating spread.json...`;
      const spreadConfig = await loadSpreadConfig();
      if (spreadConfig) {
        const updatedConfig = await updateSpreadConfig(
          spreadConfig,
          filePath,
          includePatterns,
          excludePatterns,
          options.name
        );
        await saveSpreadConfig(updatedConfig);
        spinner.succeed(`Updated spread.json with changes from ${filePath}`);
      }
    });

    watcher.on("add", async (name) => {
      const filePath = typeof name === "string" ? name : name.toString();
      spinner.text = `Detected new file ${filePath}. Updating spread.json...`;
      const spreadConfig = await loadSpreadConfig();
      if (spreadConfig) {
        const updatedConfig = await updateSpreadConfig(
          spreadConfig,
          filePath,
          includePatterns,
          excludePatterns,
          options.name
        );
        await saveSpreadConfig(updatedConfig);
        spinner.succeed(`Added new file ${filePath} to spread.json`);
      }
    });

    watcher.on("unlink", async (name) => {
      const filePath = typeof name === "string" ? name : name.toString();
      spinner.text = `Detected file deletion ${filePath}. Updating spread.json...`;
      const spreadConfig = await loadSpreadConfig();
      if (spreadConfig) {
        const updatedConfig = await updateSpreadConfig(
          spreadConfig,
          filePath,
          includePatterns,
          excludePatterns,
          options.name,
          true
        );
        await saveSpreadConfig(updatedConfig);
        spinner.succeed(`Removed deleted file ${filePath} from spread.json`);
      }
    });

    watcher.on("error", (error) => {
      spinner.fail(`Watcher error: ${error}`);
    });

    spinner.succeed(`Sync started. Watching for changes...`);
  } catch (error) {
    spinner.fail(`Failed to start sync: ${error}`);
  }
}

async function updateSpreadConfig(
  config: SpreadConfig,
  absoluteFilePath: string,
  includePatterns: string[],
  excludePatterns: string[],
  spreadItemName?: string,
  isUnlinkEvent: boolean = false
): Promise<SpreadConfig> {
  const relativeFilePath = path
    .relative(process.cwd(), absoluteFilePath)
    .replace(/\\/g, "/");

  const resolvedSpreadItemName =
    spreadItemName || path.basename(path.dirname(relativeFilePath));

  let targetSpreadItem = config.items.find(
    (item) => item.name === resolvedSpreadItemName
  );

  if (isUnlinkEvent) {
    if (targetSpreadItem) {
      targetSpreadItem.files = targetSpreadItem.files.filter(
        (f) => f.path !== relativeFilePath
      );

      if (targetSpreadItem.files.length === 0) {
        config.items = config.items.filter(
          (item) => item.name !== resolvedSpreadItemName
        );
      }
    }
    return config;
  }

  const fileContent = await readFileContent(absoluteFilePath);

  if (fileContent === null) {
    if (targetSpreadItem) {
      targetSpreadItem.files = targetSpreadItem.files.filter(
        (f) => f.path !== relativeFilePath
      );
      if (targetSpreadItem.files.length === 0) {
        config.items = config.items.filter(
          (item) => item.name !== resolvedSpreadItemName
        );
      }
    }
    return config;
  }

  const dependencies = await parseFileDependencies(fileContent);

  if (!targetSpreadItem) {
    targetSpreadItem = {
      name: resolvedSpreadItemName,
      type: "component",
      version: "1.0.0",
      files: [],
      dependencies: {},
    };
    config.items.push(targetSpreadItem);
  }

  const existingFile = targetSpreadItem.files.find(
    (f) => f.path === relativeFilePath
  );

  if (!existingFile) {
    targetSpreadItem.files.push({
      path: relativeFilePath,
      target: relativeFilePath,
    });
  }

  targetSpreadItem.dependencies = {
    ...targetSpreadItem.dependencies,
    ...dependencies,
  };

  return config;
}