import chalk from "chalk";
import prompts from "prompts";
import { saveSpreadConfig, loadSpreadConfig } from "../utils/index.js";
import { SpreadConfig } from "../types/index.js";
import path from "node:path";
import ora from "ora";

export async function initCommand(): Promise<void> {
  let spinner = ora("Checking for existing configuration...").start();

  const existingConfig = await loadSpreadConfig();
  spinner.stop();

  if (existingConfig) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: "spread.json already exists. Overwrite?",
      initial: false,
    });

    if (!overwrite) {
      console.log(chalk.yellow("Initialization cancelled."));
      return;
    }
  }

  const currentDirName = path.basename(process.cwd());

  const response = await prompts([
    {
      type: "text",
      name: "name",
      message: "Project name:",
      initial: currentDirName,
    },
    {
      type: "text",
      name: "description",
      message: "Description (optional):",
    },
    {
      type: "text",
      name: "homepage",
      message: "Homepage URL (optional):",
    },
    {
      type: "text",
      name: "author",
      message: "Author (optional):",
    },
  ]);

  spinner = ora("Saving configuration...").start();

  let projectName = response.name;
  if (projectName === "." || !projectName) {
    projectName = currentDirName;
  }

  const config: SpreadConfig = {
    $schema: "https://spread.neploom.com/schema/spread.json",
    name: projectName,
    description: response.description || undefined,
    homepage: response.homepage || undefined,
    author: response.author || undefined,
    items: [],
  };

  await saveSpreadConfig(config);

  spinner.succeed(chalk.green("spread.json created successfully!"));
}
