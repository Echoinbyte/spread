import ora from "ora";
import chalk from "chalk";
import { loadSpreadConfig, saveSpreadConfig } from "../utils/index.js";

export async function deleteCommand(name: string) {
  const spinner = ora(`Deleting spread item: ${name}...`).start();

  try {
    const config = await loadSpreadConfig();
    if (!config) {
      throw new Error("spread.json not found. Run `spread init` to create one.");
    }

    const initialLength = config.items.length;
    config.items = config.items.filter((item) => item.name !== name);

    if (config.items.length < initialLength) {
      await saveSpreadConfig(config);
      spinner.succeed(chalk.green(`Successfully deleted spread item: ${name}`));
    } else {
      spinner.warn(chalk.yellow(`Spread item with name '${name}' not found.`));
    }
  } catch (error) {
    spinner.fail(`Failed to delete spread item: ${error}`);
  }
}
