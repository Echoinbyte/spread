import ora from "ora";
import { loadSpreadConfig, saveSpreadConfig } from "../utils/index.js";

import { parsePatterns } from "../utils/pattern-parser.js";
import { minimatch } from "minimatch";

export async function unlinkCommand(
  patterns: string,
  options: { name?: string }
) {
  const spinner = ora("Unlinking files from spread.json...").start();
  try {
    const config = await loadSpreadConfig();
    if (!config) {
      throw new Error("spread.json not found. Run `spread init` to create one.");
    }

    const rawFilenames = patterns.split(",").map(p => p.replace(/\\/g, '/'));
    const processedPatterns = rawFilenames.map(p => {
      if (p.includes('*') || p.includes('?') || p.includes('[') || p.includes('{') || p.endsWith('/') || p.includes('.')) {
        return p;
      }
      return `${p}**`;
    });
    const { include: includePatterns, exclude: excludePatterns } =
      parsePatterns(processedPatterns);

    let unlinkedCount = 0;

    const itemsToProcess = options.name
      ? config.items.filter((item) => item.name === options.name)
      : config.items;

    if (options.name && itemsToProcess.length === 0) {
      spinner.warn(
        `No spread item named '${options.name}' found in spread.json.`
      );
      return;
    }

    for (const item of itemsToProcess) {
      const originalFileCount = item.files.length;
      item.files = item.files.filter((file) => {
        const filePath = file.path;
        const isIncluded = includePatterns.some((pattern) =>
          minimatch(filePath, pattern, { dot: true })
        );
        const isExcluded = excludePatterns.some((pattern) =>
          minimatch(filePath, pattern, { dot: true })
        );

        if (isIncluded && !isExcluded) {
          return false;
        }
        return true;
      });
      unlinkedCount += originalFileCount - item.files.length;
    }

    config.items = config.items.filter((item) => !(item.files.length === 0));

    if (unlinkedCount === 0) {
      spinner.warn(
        "No linked files found matching the provided patterns. Nothing to unlink."
      );
      return;
    }

    await saveSpreadConfig(config);

    spinner.succeed(`Successfully unlinked ${unlinkedCount} file(s).`);
  } catch (error) {
    spinner.fail(`Failed to unlink files: ${error}`);
  }
}
