import ora from "ora";
import chalk from "chalk";
import {
  loadSpreadConfig,
  saveSpreadConfig,
  createFileFromSpread,
  resolveSpreadUrl,
} from "../utils/index.js";
import axios from "axios";
import { GeneratedSpread } from "../types/index.js";

export async function rollbackCommand(
  nameOrUrl: string,
  options: { version?: string }
) {
  const spinner = ora("Rolling back spread...").start();

  try {
    const config = await loadSpreadConfig();
    if (!config) {
      throw new Error("spread.json not found. Run `spread init` to create one.");
    }

    let spreadToLoadback: GeneratedSpread | null = null;
    const spreadUrl = await resolveSpreadUrl(nameOrUrl, options.version, config.homepage);

    spinner.text = `Fetching spread from ${spreadUrl}...`;
    const { data: fetchedSpread } = await axios.get<GeneratedSpread>(spreadUrl);
    spreadToLoadback = fetchedSpread;

    if (!spreadToLoadback) {
      throw new Error(`Could not fetch spread data for ${nameOrUrl}`);
    }

    spinner.text = `Reverting files for ${spreadToLoadback.name}@${spreadToLoadback.version}...`;
    for (const file of spreadToLoadback.files) {
      if (file.target) {
        await createFileFromSpread(file);
      }
    }

    const existingSpreadItem = config.items.find(
      (item) => item.name === spreadToLoadback?.name
    );
    if (existingSpreadItem) {
      existingSpreadItem.version = spreadToLoadback.version;
    } else {
      config.items.push({
        name: spreadToLoadback.name,
        version: spreadToLoadback.version,
        description: spreadToLoadback.description,
        type:
          spreadToLoadback.type &&
          ["component", "utility", "hook", "layout", "page"].includes(
            spreadToLoadback.type
          )
            ? (spreadToLoadback.type as
                | "component"
                | "utility"
                | "hook"
                | "layout"
                | "page")
            : "component",
        keywords: spreadToLoadback.keywords,
        files: spreadToLoadback.files,
        spreadDependencies: spreadToLoadback.spreadDependencies,
        dependencies: spreadToLoadback.dependencies,
        devDependencies: spreadToLoadback.devDependencies,
      });
    }
    await saveSpreadConfig(config);

    spinner.succeed(
      chalk.green(
        `Successfully rolled back ${spreadToLoadback.name} to version ${spreadToLoadback.version}`
      )
    );
  } catch (error) {
    spinner.fail(`Failed to roll back spread: ${error}`);
  }
}
