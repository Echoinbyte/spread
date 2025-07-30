# Spread CLI

Spread is a powerful Command Line Interface (CLI) for managing and distributing files, components, and configurations across projects with built-in version control. Think of it as a decentralized package manager that uses Git repositories as a database, giving you granular control over your code.

## Key Features

-   **Granular Control:** Distribute individual files or groups, not just entire packages.
-   **Built-in Versioning:** Track and manage file versions; rollback with ease.
-   **Flexible Imports:** Add files from registries, partial URLs, absolute URLs in spread, or local paths.
-   **Framework Agnostic:** Share any file type across projects, regardless of framework or language.
-   **Custom Naming:** Assign custom or scoped names to your spreads.
-   **Simplified Workflow:** Intuitive commands for managing spreads.
-   **Static Files Support:** Easily manage and distribute static assets like images, fonts, and stylesheets.

## Use Cases

-   **Component Libraries:** Manage and distribute a design system's components without publishing them as a monolithic `npm` package.
-   **Boilerplate & Scaffolding:** Standardize project setups by sharing common configuration files like `tsconfig.json`, `eslint.config.mjs`, or CI/CD workflows.
-   **Dotfile Management:** Keep your personal configuration files (dotfiles) in sync across multiple machines.
-   **Server-Side Utilities:** Share database schemas, middleware, or utility functions across different backend services.

## How to Use It

### 1. Installation

```bash
npm install -g @spreadn/cli
```

### 2. Initialize Spread

In your project's root directory, run:

```bash
spread init
```

This creates a `spread.json` file, which will track your project's shared files and dependencies.

### 3. Create a Spread

You can create a "spread" from existing files in your project. This bundles them for sharing. Spread supports filenames and glob patterns.

```bash
# Create a spread with a description, type, version, and files
spread create my-button "A reusable button component" component 1.0.0 'src/components/Button.tsx'

# Create a spread with only a name and keywords
spread create my-utility -k "utility,helper"
```

This command registers the new spread in your local `spread.json`.

### 4. Add a Spread to Your Project

Add files from a registry or a URL to your project.

```bash
# Add from a registry using a spreadName
spread add button

# Add from a full URL
spread add https://myurl/spread/button

# Install a partial url
spread add /spread/button
```

### 5. Build Your Project

After adding spreads, run the `build` command. This reads your `spread.json` and writes the files from your added spreads into your project's filesystem.

```bash
spread build
```

## Command Reference

A brief overview of the most common commands. For more details, use `spread [command] --help`.

| Command                               | Description                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `spread init`                         | Initializes a `spread.json` in the current directory.                       |
| `spread create <name>`                | Creates a new spread from local files.                                      |
| `spread add <name-or-url>`            | Adds a spread from a registry or URL to your `spread.json`.                 |
| `spread build`                        | Generates the files for all added spreads into your project.                |
| `spread sync <patterns>`              | Watches files and automatically updates a spread when changes are detected. |
| `spread registry --register`          | Registers a local spread with an external registry (e.g., a GitHub repo).   |
| `spread list`                         | Lists all spreads currently in your `spread.json`.                          |
| `spread rollback <name> --version <v>` | Rolls a spread back to a specific version.                                  |
| `spread delete <name>`                | Deletes a spread from your project.                                         |

## How It Works

Spread uses a `spread.json` file in your project to manage dependencies during development. When you `add` a spread, its metadata (like the source URL and version) is saved. The `build` command then processes these dependencies, generating individual spread files and a `registry.json` file within your project's `public/spread` directory.

When your application is deployed, the `registry.json` is fetched from the `homepage` URL specified in your `spread.json`. It's crucial to ensure that both the `homepage` URL in `spread.json` and the deployed `registry.json` have the correct, accessible URLs.

For Next.js applications, the `public` folder is served directly, meaning `registry.json` will be accessible at `<rootURL>/spread/registry.json`. If you are working with plain HTML or a different setup, ensure that `registry.json` is accessible from `<rootURL>/spread/registry.json` (not `<rootURL>/public/spread/registry.json`), while still ensuring the raw content of the individual spread files is accessible via their respective URLs.


## Contributors

-   **AI** - Documentation, Help command, Schema for `spread.json` and `spread-registry.json`, some types & interfaces, regex.
-   **Enfiniq** - Init, add, create, delete, link, registry, rollback, sync, unlink commands, GitHub as a database, Routes, dependencies resolver, utils.
