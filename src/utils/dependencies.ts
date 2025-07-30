import { exec } from "node:child_process";
import { promisify } from "node:util";
import chalk from "chalk";
import prompts from "prompts";

import { DependencyMap } from "../types/index.js";
import { readPackageJson } from "./index.js";

const execAsync = promisify(exec);

export async function installDependencies(
  dependencyMap: DependencyMap,
  noInstall: boolean = false
): Promise<void> {
  if (noInstall) {
    return;
  }

  const projectPackageJson = await readPackageJson();
  const existingDependencies = projectPackageJson?.dependencies || {};
  const existingDevDependencies = projectPackageJson?.devDependencies || {};

  const allDependencies = new Map<string, string>();
  const allDevDependencies = new Map<string, string>();

  for (const [name, version] of dependencyMap.dependencies.entries()) {
    if (existingDependencies[name] && existingDependencies[name] !== version) {
      const resolvedVersion = await handleDependencyConflict(
        name,
        existingDependencies[name],
        version
      );
      if (resolvedVersion) {
        allDependencies.set(name, resolvedVersion);
      }
    } else {
      allDependencies.set(name, version);
    }
  }

  for (const [name, version] of dependencyMap.devDependencies.entries()) {
    if (
      existingDevDependencies[name] &&
      existingDevDependencies[name] !== version
    ) {
      const resolvedVersion = await handleDependencyConflict(
        name,
        existingDevDependencies[name],
        version
      );
      if (resolvedVersion) {
        allDevDependencies.set(name, resolvedVersion);
      }
    } else {
      allDevDependencies.set(name, version);
    }
  }

  const dependenciesToInstall = Array.from(allDependencies.entries());
  const devDependenciesToInstall = Array.from(allDevDependencies.entries());

  if (dependenciesToInstall.length > 0) {
    await runNpmInstall(dependenciesToInstall.map(
      ([name, version]) => `${name}@${version}`
    ), false);
  }

  if (devDependenciesToInstall.length > 0) {
    await runNpmInstall(devDependenciesToInstall.map(
      ([name, version]) => `${name}@${version}`
    ), true);
  }
}

export async function handleDependencyConflict(
  packageName: string,
  existingVersion: string,
  newVersion: string
): Promise<string | null> {
  const choices = [
    {
      title: `Use existing version (${existingVersion})`,
      value: existingVersion,
    },
    { title: `Use new version (${newVersion})`, value: newVersion },
    { title: "Skip", value: "skip" },
  ];

  const response = await prompts({
    type: "select",
    name: "version",
    message: chalk.yellow(`Version conflict detected for ${packageName}. Which version would you like to use?`),
    choices: choices,
    initial: 0,
  });

  if (response.version === "skip") {
    return null;
  }

  return response.version || existingVersion;
}

async function runNpmInstall(
  packages: string[],
  isDev: boolean
): Promise<void> {
  if (packages.length === 0) return;

  const devFlag = isDev ? "--save-dev" : "";
  const quotedPackages = packages.map((pkg) => `"${pkg}"`);
  const command = `npm install ${devFlag} ${quotedPackages.join(" ")}`;

  try {
    await execAsync(command);
  } catch (error) {
    throw new Error(`Failed to install packages: ${error}`);
  }
}
