import ora from "ora";
import chalk from "chalk";
import {
  loadSpreadConfig,
  saveSpreadConfig,
  readFileContent,
  parseFileDependencies,
  isBinaryFile,
} from "../utils/index.js";
import { findFiles } from "../utils/glob.js";
import { SpreadFile, SpreadItem } from "../types/index.js";

import { parsePatterns } from "../utils/pattern-parser.js";

export async function createCommand(
  name: string,
  description: string | undefined,
  type: string | undefined,
  version: string | undefined,
  keywords: string[],
  filenames: string[]
) {
  const spinner = ora("Creating spread item...").start();

  try {
    const config = await loadSpreadConfig();
    if (!config) {
      throw new Error(
        "spread.json not found. Run `spread init` to create one."
      );
    }

    const { include: includePatterns, exclude: initialExcludePatterns } =
      parsePatterns(filenames);

    const excludePatterns = [...initialExcludePatterns, "node_modules/**"];

    const resolvedFiles = await findFiles(includePatterns, excludePatterns);

    if (resolvedFiles.length === 0) {
      spinner.warn("No files found matching the provided patterns.");
    }

    const spreadFiles: SpreadFile[] = [];
    let allDependencies: { [key: string]: string } = {};

    for (const filePath of resolvedFiles) {
      const content = await readFileContent(filePath);
      if (!isBinaryFile(filePath)) {
        const fileDependencies = await parseFileDependencies(content);
        allDependencies = { ...allDependencies, ...fileDependencies };
      }

      spreadFiles.push({
        path: filePath,
        target: filePath,
      });
    }

    const targetSpreadItem = config.items.find((item) => item.name === name);

    if (targetSpreadItem) {
      if (description !== undefined) {
        targetSpreadItem.description = description;
      }
      if (
        type !== undefined
      ) {
        targetSpreadItem.type = type
      }
      if (version !== undefined) {
        targetSpreadItem.version = version;
      }
      if (keywords.length > 0) {
        targetSpreadItem.keywords = keywords;
      }
      if (resolvedFiles.length > 0) {
        targetSpreadItem.files = spreadFiles;
      }
      if (Object.keys(allDependencies).length > 0) {
        targetSpreadItem.dependencies = {
          ...(targetSpreadItem.dependencies || {}),
          ...allDependencies,
        };
      }
      spinner.succeed(chalk.green(`Successfully updated spread item: ${name}`));
    } else {
      const newSpreadItem: SpreadItem = {
        name: name,
        description: description,
        type: type,
        version: version || "1.0.0",
        keywords: keywords.length > 0 ? keywords : undefined,
        files: spreadFiles,
        dependencies:
          Object.keys(allDependencies).length > 0 ? allDependencies : undefined,
      };
      config.items.push(newSpreadItem);
      spinner.succeed(chalk.green(`Successfully created spread item: ${name}`));
    }

    await saveSpreadConfig(config);
  } catch (error) {
    spinner.fail(`Failed to create spread item: ${error}`);
  }
}
