import fs from "fs-extra";
import path from "node:path";
import axios from "axios";
import chalk from "chalk";
import { findFiles } from "./glob.js";

import semver from "semver";

import {
  SpreadConfig,
  GeneratedSpread,
  RegistryData,
  SpreadFile,
  SpreadDependency,
  SpreadItem,
} from "../types/index.js";

import { getRawRegistryFromGithub } from "./github.js";

export const SPREAD_CONFIG_FILE = "spread.json";
export const SPREAD_OUTPUT_DIR = "public/spread";
export const REGISTRY_FILE = "registry.json";

export async function loadSpreadConfig(
  projectRoot: string = process.cwd()
): Promise<SpreadConfig | null> {
  const configPath = path.join(projectRoot, SPREAD_CONFIG_FILE);

  if (!(await fs.pathExists(configPath))) {
    return null;
  }

  try {
    const config = await fs.readJson(configPath);
    if (config && config.items) {
      config.items.forEach((item: SpreadItem) => {
        if (item.files) {
          item.files.forEach((file: SpreadFile) => {
            if (file.path) {
              file.path = file.path.replace(/\\/g, "/");
            }
          });
        }
      });
    }
    return config as SpreadConfig;
  } catch (error) {
    throw new Error(`Error reading ${SPREAD_CONFIG_FILE}: ${error}`);
  }
}

export async function saveSpreadConfig(
  config: SpreadConfig,
  projectRoot: string = process.cwd()
): Promise<void> {
  const configPath = path.join(projectRoot, SPREAD_CONFIG_FILE);
  await fs.writeJson(configPath, config, { spaces: 2 });
}

export async function ensureSpreadOutputDir(
  projectRoot: string = process.cwd()
): Promise<string> {
  const outputDir = path.join(projectRoot, SPREAD_OUTPUT_DIR);
  await fs.ensureDir(outputDir);
  return outputDir;
}

export async function readFileContent(
  filePath: string,
  projectRoot: string = process.cwd()
): Promise<string> {
  const fullPath = path.resolve(projectRoot, filePath);

  if (!(await fs.pathExists(fullPath))) {
    return "";
  }

  if (isBinaryFile(filePath)) {
    const buffer = await fs.readFile(fullPath);
    return buffer.toString("base64");
  }

  try {
    const content = await fs.readFile(fullPath, "utf-8");
    return content;
  } catch (error) {
    console.error(chalk.red(`Error reading file ${filePath}:`), error);
    return "";
  }
}

export async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch content from ${url}: ${error}`);
  }
}

export function getFileExtension(filePath: string): string {
  return path.extname(filePath);
}

export function generateTargetPath(name: string, filePath: string): string {
  const extension = getFileExtension(filePath);
  return `src/app/component/ui/${name}${extension}`;
}

export const BINARY_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ico",
  ".svg",
  ".webp",
  ".mp3",
  ".wav",
  ".ogg",
  ".mp4",
  ".avi",
  ".mov",
  ".wmv",
  ".flv",
  ".mkv",
  ".webm",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
];

export function isBinaryFile(filePath: string): boolean {
  const extension = getFileExtension(filePath);
  return BINARY_EXTENSIONS.includes(extension.toLowerCase());
}

export async function createFileFromSpread(
  file: SpreadFile,
  projectRoot: string = process.cwd()
): Promise<void> {
  const targetPath = path.resolve(projectRoot, file.target!);
  await fs.ensureDir(path.dirname(targetPath));

  if (isBinaryFile(file.target!)) {
    let buffer: Buffer;
    if (file.content) {
      buffer = Buffer.from(file.content, "base64");
    } else if (file.absolute) {
      const response = await axios.get(file.absolute, {
        responseType: "arraybuffer",
      });
      buffer = Buffer.from(response.data);
    } else {
      throw new Error(
        "Binary file must have either content or absolute URL for remote installation."
      );
    }
    await fs.writeFile(targetPath, buffer);
  } else {
    let content = "";
    if (file.content) {
      content = file.content;
    } else if (file.absolute) {
      content = await fetchUrlContent(file.absolute);
    } else if (file.content === null) {
      content = "";
    } else {
      throw new Error(
        "Text file must have either content or absolute URL for remote installation."
      );
    }
    await fs.writeFile(targetPath, content, "utf-8");
  }
}

export async function readPackageJson(
  projectRoot: string = process.cwd()
): Promise<{ [key: string]: any } | null> {
  const packageJsonPath = path.join(projectRoot, "package.json");

  if (!(await fs.pathExists(packageJsonPath))) {
    return null;
  }

  try {
    const packageJson = await fs.readJson(packageJsonPath);
    return packageJson;
  } catch (error) {
    console.error(chalk.red(`Error reading package.json:`), error);
    return null;
  }
}

export async function parseFileDependencies(
  fileContent: string
): Promise<SpreadDependency> {
  const dependencies: SpreadDependency = {};
  const packageJson = await readPackageJson();

  if (!packageJson) {
    console.warn(
      chalk.yellow(
        "Warning: package.json not found. Cannot resolve package versions."
      )
    );
    return dependencies;
  }

  const importRegex =
    /(?:import(?:.*?)from\s+["|']([^"]+)["|'])|(?:require\(["|']([^"]+)["|']\))/g;
  let match;

  while ((match = importRegex.exec(fileContent)) !== null) {
    const packageName = match[1] || match[2];
    if (
      packageName &&
      !packageName.startsWith(".") &&
      !packageName.startsWith("/")
    ) {
      const version =
        packageJson.dependencies?.[packageName] ||
        packageJson.devDependencies?.[packageName];
      if (version) {
        dependencies[packageName] = version;
      }
    }
  }
  return dependencies;
}

export async function loadRegistry(
  projectRoot: string = process.cwd()
): Promise<RegistryData> {
  const outputDir = await ensureSpreadOutputDir(projectRoot);
  const registryPath = path.join(outputDir, REGISTRY_FILE);

  if (!(await fs.pathExists(registryPath))) {
    return {
      $schema: "https://spread.neploom.com/schema/spread-registry.json",
      spreads: {},
    };
  }

  return await fs.readJson(registryPath);
}

export async function saveRegistry(
  registry: RegistryData,
  projectRoot: string = process.cwd()
): Promise<void> {
  const outputDir = await ensureSpreadOutputDir(projectRoot);
  const registryPath = path.join(outputDir, REGISTRY_FILE);
  await fs.writeJson(registryPath, registry, { spaces: 2 });
}

export async function fetchSpreadFromUrl(
  url: string
): Promise<GeneratedSpread> {
  try {
    const response = await axios.get(url);
    return response.data as GeneratedSpread;
  } catch (error) {
    throw new Error(`Failed to fetch spread from ${url}: ${error}`);
  }
}

export function isUrl(str: string): boolean {
  return /^https?:\/\//i.test(str);
}

export async function resolveSpreadUrl(
  nameOrUrl: string,
  optionsVersion?: string,
  homepage?: string
): Promise<string> {
  let namePart = nameOrUrl;
  let versionPart: string | undefined;

  if (
    namePart.includes("Program Files/Git/spread/") ||
    namePart.includes("Git/spread/")
  ) {
    const match = namePart.match(/\/spread\/(.+)$/);
    if (match) {
      namePart = `/spread/${match[1]}`;
    }
  }

  if (nameOrUrl.includes("@")) {
    const parts = nameOrUrl.split("@");
    const lastPart = parts[parts.length - 1];
    if (lastPart === "latest" || semver.valid(semver.coerce(lastPart))) {
      versionPart = lastPart;
      namePart = parts.slice(0, -1).join("@");
    }
  }

  if (!versionPart) {
    versionPart = optionsVersion;
  }

  if (namePart.startsWith("/")) {
    if (!homepage) {
      throw new Error("Homepage is required to resolve partial URLs");
    }

    let fullHomepage = homepage;
    if (!/^https?:\/\//i.test(fullHomepage)) {
      fullHomepage = `http://${fullHomepage}`;
    }

    const fullUrl = `${fullHomepage}${namePart}`;
    return resolveSpreadUrl(fullUrl, versionPart, homepage);
  }

  if (path.isAbsolute(namePart)) {
    const files = await findFiles([namePart]);
    if (files.length === 0) {
      throw new Error(`File not found: ${namePart}`);
    }
    return files[0];
  }

  if (isUrl(namePart)) {
    let registryUrl: string = "";
    try {
      const urlObj = new URL(namePart);
      const registryPathname = path.posix.join(
        path.posix.dirname(urlObj.pathname),
        "registry.json"
      );
      registryUrl = new URL(registryPathname, urlObj.origin).href;

      const { data: registry } = await axios.get<RegistryData>(registryUrl);
      const componentName = path.posix.basename(urlObj.pathname);

      if (!registry.spreads[componentName]) {
        throw new Error(
          `Component '${componentName}' not found in registry at ${registryUrl}`
        );
      }

      const spreadInfo = registry.spreads[componentName];
      let targetVersion = versionPart;

      if (!targetVersion || targetVersion === "latest") {
        targetVersion = getLatestVersion(spreadInfo.versions);
      }

      if (!spreadInfo.versions.includes(targetVersion)) {
        throw new Error(
          `Version '${targetVersion}' for component '${componentName}' not found.`
        );
      }

      return `${spreadInfo.spread}@${targetVersion}.json`;
    } catch (e) {
      const error = e as any;
      if (error instanceof TypeError && error.message.includes("Invalid URL")) {
      } else if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error(
          `Could not find registry.json at ${registryUrl}. A direct link to a spread file is not supported.`
        );
      }
      throw new Error(
        `Failed to resolve component from ${namePart}: ${error.message}`
      );
    }
  }

  try {
    const registry = await getRawRegistryFromGithub();
    if (!registry || !registry.spreads) {
      throw new Error("Could not fetch or parse the centralized registry.");
    }

    const targetSpreadName = namePart;

    if (!registry.spreads[targetSpreadName]) {
      throw new Error(
        `Spread '${targetSpreadName}' not found in the centralized registry.`
      );
    }

    const spreadInfo = registry.spreads[targetSpreadName];
    let targetVersion = versionPart;

    if (!targetVersion || targetVersion === "latest") {
      targetVersion = getLatestVersion(spreadInfo.versions);
    }

    if (!spreadInfo.versions.includes(targetVersion)) {
      throw new Error(
        `Version '${targetVersion}' for spread '${targetSpreadName}' not found.`
      );
    }

    return `${spreadInfo.spread}@${targetVersion}.json`;
  } catch (e) {
    const error = e as any;
    throw new Error(
      `Failed to resolve spread '${nameOrUrl}': ${error.message}`
    );
  }
}

export function getLatestVersion(versions: string[]): string {
  return versions.sort((a, b) => semver.compare(b, a))[0]!;
}

export function parseSpreadNameAndVersion(input: string): {
  name: string;
  version?: string;
  latest?: boolean;
} {
  if (input.includes("@")) {
    const parts = input.split("@");
    const name = parts[0]!;
    const versionPart = parts[1]!;

    if (versionPart === "latest") {
      return { name, latest: true };
    }

    return { name, version: versionPart };
  }

  return { name: input };
}
