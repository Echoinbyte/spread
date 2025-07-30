import chalk from "chalk";
import ora from "ora";
import axios from "axios";
import { loadRegistry } from "../utils/index.js";
import { RegistryOptions } from "../types/index.js";

export async function registryCommand(options: RegistryOptions): Promise<void> {
  if (options.register) {
    await registerSpread(options);
  }
}

async function registerSpread(options: RegistryOptions): Promise<void> {
  const { spreadName, nameInAppSpreads, localRegistry, key } = options;

  if (!spreadName) {
    ora().fail(
      chalk.red("Error: Spread name is required. Use -s or --spread-name")
    );
    return;
  }

  if (!key) {
    ora().fail(chalk.red("Error: API key is required. Use -k or --key"));
    return;
  }

  const spinner = ora("Registering spread with registry...").start();

  try {
    const localName = nameInAppSpreads || spreadName;

    let registry;

    if (localRegistry) {
      spinner.text = `Fetching registry from ${localRegistry}...`;
      const response = await axios.get(localRegistry);
      registry = response.data;
    } else {
      spinner.text = "Loading local registry.json...";
      registry = await loadRegistry();
    }

    const localSpread = registry.spreads[localName];
    if (!localSpread) {
      spinner.fail(
        `Spread "${localName}" not found in local registry. Run 'spread build' first.`
      );
      return;
    }

    spinner.text = "Submitting to spread registry...";

    const registryData = {
      name: spreadName,
      spread: localSpread.spread,
      versions: localSpread.versions,
      apiKey: key,
    };

    const registryUrl = `https://spread.neploom.com/api/register`;
    await axios.post(registryUrl, registryData);

    spinner.succeed(
      chalk.green(
        `Successfully registered "${spreadName}" with spread registry`
      )
    );
    spinner.info(chalk.blue(`Spread URL: ${localSpread.spread}`));
    spinner.info(chalk.blue(`Versions: ${localSpread.versions.join(", ")}`));
    spinner.info(
      chalk.yellow(`Users can now install with: npx spread add ${spreadName}`)
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      spinner.fail(
        `Registration failed: ${error.response.data.message || error.message}`
      );
    } else {
      spinner.fail(`Registration failed: ${error}`);
    }
  }
}
