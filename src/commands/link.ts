import ora from "ora";
import {
  loadSpreadConfig,
  saveSpreadConfig,
  readFileContent,
  parseFileDependencies,
} from "../utils/index.js";
import { findFiles } from "../utils/glob.js";
import { SpreadConfig, SpreadFile } from "../types/index.js";
import path from "node:path";
import { parsePatterns } from "../utils/pattern-parser.js";

export async function linkCommand(
  patterns: string,
  options: { name?: string }
) {
  const spinner = ora("Linking files...").start();

  try {
    const config = await loadSpreadConfig();
    if (!config) {
      spinner.fail("spread.json not found. Run `spread init` to create one.");
      return;
    }
    const rawFilenames = patterns.split(",");
    const { include: includePatterns, exclude: initialExcludePatterns } =
      parsePatterns(rawFilenames);

    const excludePatterns = [...initialExcludePatterns, "node_modules/**"];

    const filesToLink = await findFiles(includePatterns, excludePatterns);

    if (filesToLink.length === 0) {
      spinner.warn("No files found matching the provided patterns. Nothing to link.");
      return;
    }

    const groupedFiles: { [spreadItemName: string]: string[] } = {};

    for (const filePath of filesToLink) {
      const relativeFilePath = path
        .relative(process.cwd(), filePath)
        .replace(/\\/g, "/");
      const resolvedSpreadItemName =
        options.name || path.basename(path.dirname(relativeFilePath));

      if (!groupedFiles[resolvedSpreadItemName]) {
        groupedFiles[resolvedSpreadItemName] = [];
      }
      groupedFiles[resolvedSpreadItemName].push(filePath);
    }

    for (const spreadItemName in groupedFiles) {
      const filesInGroup = groupedFiles[spreadItemName];
      await updateSpreadConfigForLink(config, spreadItemName, filesInGroup);
    }

    await saveSpreadConfig(config);

    spinner.succeed("All files linked successfully.");
  } catch (error) {
    spinner.fail(`Failed to link files: ${error}`);
  }
}

async function updateSpreadConfigForLink(
  config: SpreadConfig,
  spreadItemName: string,
  absoluteFilePaths: string[]
): Promise<SpreadConfig> {
  let targetSpreadItem = config.items.find(
    (item) => item.name === spreadItemName
  );

  if (!targetSpreadItem) {
    targetSpreadItem = {
      name: spreadItemName,
      type: "component",
      version: "1.0.0",
      files: [],
      dependencies: {},
    };
    config.items.push(targetSpreadItem);
  }

  const newSpreadFiles: SpreadFile[] = [];
  let aggregatedDependencies: { [key: string]: string } = {};

  for (const absoluteFilePath of absoluteFilePaths) {
    const relativeFilePath = path
      .relative(process.cwd(), absoluteFilePath)
      .replace(/\\/g, "/");
    const fileContent = await readFileContent(absoluteFilePath);

    if (fileContent) {
      const fileDependencies = await parseFileDependencies(fileContent);
      aggregatedDependencies = {
        ...aggregatedDependencies,
        ...fileDependencies,
      };

      newSpreadFiles.push({
        path: relativeFilePath,
        target: relativeFilePath,
      });
    }
  }

  const existingFilePaths = new Set(
    targetSpreadItem.files.map((file) => file.path)
  );
  for (const newFile of newSpreadFiles) {
    if (!existingFilePaths.has(newFile.path)) {
      targetSpreadItem.files.push(newFile);
    }
  }
  targetSpreadItem.dependencies = {
    ...targetSpreadItem.dependencies,
    ...aggregatedDependencies,
  };

  return config;
}