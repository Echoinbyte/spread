import chalk from "chalk";
import { loadRegistry, loadSpreadConfig } from "../utils/index.js";
import { RegistryData } from "../types/index.js";

export async function listCommand(): Promise<void> {
  try {
    const config = await loadSpreadConfig();
    if (config && config.items.length > 0) {
      console.log(chalk.blue("\nProject Spreads:"));
      for (const item of config.items) {
        const version = item.version || "0.0.0";
        console.log(
          `  ${chalk.cyan(item.name)}@${version} - ${
            item.description || "No description"
          }`
        );
      }
    }

    const registry = await loadRegistry();
    if (Object.keys(registry.spreads).length > 0) {
      console.log(chalk.blue("\nBuilt Spreads:"));
      for (const [name, spreadInfo] of Object.entries(registry.spreads) as [
        string,
        RegistryData["spreads"][string]
      ][]) {
        console.log(
          `  ${chalk.cyan(name)} - versions: ${spreadInfo.versions.join(", ")}`
        );
      }
    } else {
      console.log(
        chalk.yellow("\nNo built spreads found. Run `spread build` to generate them.")
      );
    }
  } catch (error) {
    console.error(chalk.red(`Failed to list spreads: ${error}`));
  }
}
