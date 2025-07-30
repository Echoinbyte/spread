#!/usr/bin/env node

import dotenv from "dotenv";

const originalLog = console.log;
console.log = () => {};
dotenv.config({ path: ".env.local" });
console.log = originalLog;

import { Command } from "commander";
import chalk from "chalk";
import { buildCommand } from "./commands/build.js";
import { addCommand } from "./commands/add.js";
import { initCommand } from "./commands/init.js";
import { listCommand } from "./commands/list.js";
import { registryCommand } from "./commands/registry.js";
import { syncCommand } from "./commands/sync.js";
import { linkCommand } from "./commands/link.js";
import { rollbackCommand } from "./commands/rollback.js";
import { createCommand } from "./commands/create.js";
import { unlinkCommand } from "./commands/unlink.js";
import { deleteCommand } from "./commands/delete.js";

const program = new Command();

program
  .name("spread")
  .description(
    "CLI tool for distributing files and components with version control"
  )
  .version("1.0.0");

program
  .command("init")
  .description("Initialize a new spread.json file.")
  .addHelpText(
    "after",
    `
Usage: spread init

This command initializes a new spread.json file in the current directory.
It will prompt you for project details such as name, description, homepage, and author.
`
  )
  .action(initCommand);

program
  .command("build")
  .description("Build and generate spread files.")
  .addHelpText(
    "after",
    `
Usage: spread build

This command processes the configurations in spread.json and generates the necessary output files.
`
  )
  .action(buildCommand);

program
  .command("add")
  .description("Add a component from registry or URL.")
  .argument("<name-or-url>", "Component name from registry or direct URL")
  .option("-v, --version <version>", "Specific version to install")
  .option("--latest", "Install latest version")
  .addHelpText(
    "after",
    `
Usage: spread add <name-or-url> [options]

<name-or-url>  : The name of the component from the registry (e.g., 'button') or a direct URL to a spread file.
-v, --version <version> : Specify a particular version to install (e.g., '1.0.0').
--latest       : Install the latest available version of the component.

Examples:
  $ spread add my-component
  $ spread add button -v 1.0.0
  $ spread add https://example.com/spreads/my-component.json --latest
`
  )
  .action((nameOrUrl, options) => {
    addCommand(nameOrUrl, options);
  });

program
  .command("list")
  .description("List available components in the project.")
  .addHelpText(
    "after",
    `
Usage: spread list

This command lists all available components/spread items configured in your project's spread.json file.
`
  )
  .action(listCommand);

program
  .command("registry")
  .description("Manage spread registry operations.")
  .option("-r, --register", "Register a spread with the registry")
  .option(
    "-s, --spread-name <name>",
    "Name to register in the external registry"
  )
  .option(
    "-n, --name-in-app-spreads <name>",
    "Name in local app-spreads.json (defaults to spread-name)"
  )

  .option("-k, --key <key>", "API key for registry operations")
  .addHelpText(
    "after",
    `
Usage: spread registry [options]

-r, --register : Register a spread with the external registry.
-s, --spread-name <name> : The name to register your spread under in the external registry.
-n, --name-in-app-spreads <name> : The name of the spread in your local app-spreads.json (defaults to --spread-name if not provided).
-k, --key <key> : API key required for authentication with the registry.

Examples:
  $ spread registry --register --spread-name my-component --name-in-app-spreads my-local-component -k your-api-key
  $ spread registry -r -s another-component -k your-api-key
`
  )
  .action(registryCommand);

program
  .command("sync")
  .description("Watch files and update spread.json on changes.")
  .argument("<patterns>", "Comma-separated glob patterns for files to watch")
  .option(
    "-n, --name <name>",
    "Optional name for the spread item to group files under"
  )
  .option("--debounce <milliseconds>", "Debounce time for updates", "500")
  .addHelpText(
    "after",
    `
Usage: spread sync <patterns> [options]

<patterns>     : Comma-separated glob patterns (e.g., 'src/**/*.ts,components/*.js') for files to watch.
-n, --name <name> : Optional name for the spread item to group these files under in spread.json.
--debounce <milliseconds> : Time in milliseconds to wait after a change before updating (default: 500).

Examples:
  $ spread sync "src/**/*.ts"
  $ spread sync "public/assets/*.png" --name my-assets --debounce 1000
`
  )
  .action((patterns, options) => {
    syncCommand(patterns, {
      debounce: parseInt(options.debounce, 10),
      name: options.name,
    });
  });

program
  .command("link")
  .description("Link existing files to a spread item.")
  .argument("<patterns>", "Comma-separated glob patterns for files to link")
  .option(
    "-n, --name <name>",
    "Optional name for the spread item to group files under"
  )
  .addHelpText(
    "after",
    `
Usage: spread link <patterns> [options]

<patterns>     : Comma-separated glob patterns (e.g., 'src/components/*.tsx') for files to link.
-n, --name <name> : Optional name for the spread item to link these files to. If omitted, files are linked to a default or inferred item.

Examples:
  $ spread link "src/components/Button.tsx" --name my-button
  $ spread link "assets/**/*.svg" --name my-assets
`
  )
  .action((patterns, options) => {
    linkCommand(patterns, { name: options.name });
  });

program
  .command("rollback")
  .description("Rollback a spread to a previous version.")
  .argument("<name-or-url>", "Spread name from registry or direct URL")
  .option("-v, --version <version>", "Specific version to rollback to")
  .addHelpText(
    "after",
    `
Usage: spread rollback <name-or-url> [options]

<name-or-url>  : The name of the spread item or a direct URL to its spread file.
-v, --version <version> : The specific version to rollback to (e.g., '0.9.0').

Examples:
  $ spread rollback my-component -v 0.9.0
  $ spread rollback https://example.com/spreads/old-component.json -v 1.0.0
`
  )
  .action((nameOrUrl, options) => {
    rollbackCommand(nameOrUrl, options);
  });

program
  .command("create")
  .description("Create a new spread item.")
  .argument("<name>", "Name of the spread item")
  .argument("[description]", "Description of the spread item")
  .argument("[type]", "Type of the spread item")
  .argument("[version]", "Version of the spread item")
  .argument("[filenames...]", "Files to include (supports glob patterns)")
  .option(
    "-k, --keywords <keywords>",
    "Comma-separated keywords for the spread item"
  )
  .addHelpText(
    "after",
    `
Usage: spread create <name> [description] [type] [version] [filenames...] [options]

<name>         : A unique name for your new spread item.
[description]  : Optional. A brief description of the spread item.
[type]         : Optional. The type of spread item (e.g., 'component', 'utility', 'hook', 'layout', 'page').
[version]      : Optional. The initial version of the spread item.
[filenames...] : Optional. Space-separated list of files or glob patterns to include in this spread item.
-k, --keywords <keywords> : Comma-separated keywords to help categorize your spread item (e.g., 'ui,button,react').

Examples:
  $ spread create MyButton "A reusable button component" component 1.0.0 src/components/MyButton.tsx
  $ spread create MyUtility -k "utility,helper"
  $ spread create MyPage layout 1.0.0 "src/pages/MyPage.tsx,src/styles/my-page.css"
`
  )
  .action((name, description, type, version, filenames, options) => {
    const keywords = options.keywords ? options.keywords.split(",") : [];
    const allArgs = [description, type, version, ...(filenames || [])].filter(arg => arg !== undefined);

    let parsedDescription: string | undefined;
    let parsedType: string | undefined;
    let parsedVersion: string | undefined;
    const parsedFilenames: string[] = [];

    if (allArgs.length > 0 && allArgs[0] && !allArgs[0].match(/^\d+\.\d+\.\d+$/) && !["component", "utility", "hook", "layout", "page"].includes(allArgs[0])) {
      parsedDescription = allArgs.shift();
    }

    if (allArgs.length > 0 && allArgs[0] && !allArgs[0].match(/^\d+\.\d+\.\d+$/)) {
      parsedType = allArgs.shift();
    }

    if (allArgs.length > 0 && allArgs[0] && allArgs[0].match(/^\d+\.\d+\.\d+$/)) {
      parsedVersion = allArgs.shift();
    }
    
    parsedFilenames.push(...allArgs);

    createCommand(name, parsedDescription, parsedType, parsedVersion, keywords, parsedFilenames);
  });

program
  .command("unlink")
  .description("Unlink files from a spread item.")
  .argument("<patterns>", "Comma-separated glob patterns for files to unlink")
  .option(
    "-n, --name <name>",
    "Optional name for the spread item to unlink files from"
  )
  .addHelpText(
    "after",
    `
Usage: spread unlink <patterns> [options]

<patterns>     : Comma-separated glob patterns (e.g., 'src/components/*.tsx') for files to unlink.
-n, --name <name> : Optional name of the spread item from which to unlink files. If omitted, files are unlinked from all items they are part of.

Examples:
  $ spread unlink "src/components/Button.tsx" --name my-button
  $ spread unlink "assets/**/*.svg"
`
  )
  .action((patterns, options) => {
    unlinkCommand(patterns, { name: options.name });
  });

program
  .command("delete")
  .description("Delete a spread item.")
  .argument("<name>", "Name of the spread item to delete")
  .addHelpText(
    "after",
    `
Usage: spread delete <name>

<name>         : The name of the spread item to delete.

Examples:
  $ spread delete MyComponent
  $ spread delete AnotherUtility
`
  )
  .action((name) => {
    deleteCommand(name);
  });

program.on("command:*", () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(" ")}`));
  console.log(chalk.yellow("See spread -h for a list of available commands."));
  process.exit(1);
});

program.configureHelp({
  commandUsage: (command) => {
    const args = command.args.join(" ");
    const options = command.options.length > 0 ? "[options]" : "";
    return `${command.name()} ${args} ${options}`.trim();
  },
});

program.parse();