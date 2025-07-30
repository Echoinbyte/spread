export interface SpreadFile {
  path: string;
  absolute?: string;
  target?: string;
  content?: string;
}

export interface SpreadDependency {
  [packageName: string]: string;
}

export interface SpreadDependencies {
  [urlOrSpreadName: string]: string;
}

export interface SpreadItem {
  name: string;
  description?: string;
  type?: string;
  version?: string;
  keywords?: string[];
  files: SpreadFile[];
  spreadDependencies?: SpreadDependencies;
  dependencies?: SpreadDependency;
  devDependencies?: SpreadDependency;
}

export interface SpreadConfig {
  $schema?: string;
  name: string;
  description?: string;
  homepage?: string;
  author?: string;
  items: SpreadItem[];
}

export interface GeneratedSpread {
  $schema?: string;
  name: string;
  description?: string;
  type?: string;
  version?: string;
  keywords?: string[];
  spreadDependencies?: SpreadDependencies;
  dependencies?: SpreadDependency;
  devDependencies?: SpreadDependency;
  files: SpreadFile[];
}

export interface RegistryData {
  $schema?: string;
  spreads: {
    [spreadName: string]: {
      spread: string;
      versions: string[];
    };
  };
}

export interface RegistrySpread {
  name: string;
  description?: string;
  type?: string;
  version: string;
  keywords?: string[];
  url: string;
}

export interface InstallOptions {
  version?: string;
  latest?: boolean;
  noInstall?: boolean;
}

export interface RegistryOptions {
  register?: boolean;
  spreadName?: string;
  nameInAppSpreads?: string;
  localRegistry?: string;
  key?: string;
}

export interface DependencyMap {
  dependencies: Map<string, string>;
  devDependencies: Map<string, string>;
}
