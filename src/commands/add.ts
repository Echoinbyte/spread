import chalk from "chalk";
import ora from "ora";
import {
  createFileFromSpread,
  loadSpreadConfig,
  resolveSpreadUrl,
} from "../utils/index.js";
import {
  GeneratedSpread,
  DependencyMap,
  InstallOptions,
  SpreadDependency,
} from "../types/index.js";
import {
  installDependencies,
  handleDependencyConflict,
} from "../utils/dependencies.js";

import axios from "axios";

export async function addCommand(
  nameOrUrl: string,
  options: InstallOptions
): Promise<void> {
  const spinner = ora("Resolving spread...").start();

  if (!nameOrUrl) {
    spinner.fail("A spread name or URL is required.");
    return;
  }

  try {
    const config = await loadSpreadConfig();
    const homepage = config?.homepage;

    const spreadUrl = await resolveSpreadUrl(nameOrUrl, options.version, homepage);

    spinner.text = "Fetching spread metadata...";
    const { data: spread } = await axios.get<GeneratedSpread>(spreadUrl);

    spinner.text = "Installing spread files...";
    await installSpreadFiles(spread);

    spinner.text = "Processing spread dependencies...";
    const dependencyMap = await processSpreadDependencies(
      spread,
      new Set(),
      homepage,
      options
    );

    if (!options.noInstall) {
      spinner.text = "Installing npm packages...";
      await installDependencies(dependencyMap);
    }

    spinner.succeed(
      chalk.green(`Successfully installed ${spread.name}@${spread.version}`)
    );
  } catch (error) {
    spinner.fail(`Failed to install spread: ${error}`);
  }
}

async function installSpreadFiles(spread: GeneratedSpread): Promise<void> {
  for (const file of spread.files) {
    if (!file.target) {
      continue;
    }
    await createFileFromSpread(file);
  }
}

async function processSpreadDependencies(
  spread: GeneratedSpread,
  visited: Set<string>,
  homepage?: string,
  options?: InstallOptions
): Promise<DependencyMap> {
  const dependencyMap: DependencyMap = {
    dependencies: new Map(),
    devDependencies: new Map(),
  };

  await addDependenciesToMap(spread.dependencies, dependencyMap.dependencies);
  await addDependenciesToMap(spread.devDependencies, dependencyMap.devDependencies);

  if (spread.spreadDependencies) {
    for (const [depName, depVersion] of Object.entries(
      spread.spreadDependencies
    )) {
      const depKey = `${depName}@${depVersion}`;

      if (visited.has(depKey)) {
        continue;
      }

      visited.add(depKey);

      try {
        const spreadUrl = await resolveSpreadUrl(
          depName,
          options?.version,
          homepage
        );

        const { data: depSpread } = await axios.get<GeneratedSpread>(spreadUrl);

        await installSpreadFiles(depSpread);

        const childDependencyMap = await processSpreadDependencies(
          depSpread,
          visited,
          homepage,
          options
        );

        await mergeDependencyMaps(dependencyMap, childDependencyMap);
      } catch (error) {
        console.warn(
          chalk.yellow(
            `Warning: Failed to process spread dependency ${depName}@${depVersion}: ${error}`
          )
        );
      }
    }
  }

  return dependencyMap;
}

async function addDependenciesToMap(
  dependencies: SpreadDependency | undefined,
  targetMap: Map<string, string>
): Promise<void> {
  if (!dependencies) return;

  for (const [name, version] of Object.entries(dependencies)) {
    if (targetMap.has(name)) {
      const existingVersion = targetMap.get(name)!;
      if (existingVersion !== version) {
        const resolvedVersion = await handleDependencyConflict(
          name,
          existingVersion,
          version
        );
        if (resolvedVersion) {
          targetMap.set(name, resolvedVersion);
        }
      }
    } else {
      targetMap.set(name, version);
    }
  }
}

async function mergeDependencyMaps(
  target: DependencyMap,
  source: DependencyMap
): Promise<void> {
  for (const [name, version] of source.dependencies) {
    if (target.dependencies.has(name)) {
      const existingVersion = target.dependencies.get(name)!;
      if (existingVersion !== version) {
        const resolvedVersion = await handleDependencyConflict(
          name,
          existingVersion,
          version
        );
        if (resolvedVersion) {
          target.dependencies.set(name, resolvedVersion);
        }
      }
    } else {
      target.dependencies.set(name, version);
    }
  }

  for (const [name, version] of source.devDependencies) {
    if (target.devDependencies.has(name)) {
      const existingVersion = target.devDependencies.get(name)!;
      if (existingVersion !== version) {
        const resolvedVersion = await handleDependencyConflict(
          name,
          existingVersion,
          version
        );
        if (resolvedVersion) {
          target.devDependencies.set(name, resolvedVersion);
        }
      }
    } else {
      target.devDependencies.set(name, version);
    }
  }
}
