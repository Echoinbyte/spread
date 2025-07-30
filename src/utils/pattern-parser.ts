import path from "node:path";

export function parsePatterns(rawPatterns: string[]): {
  include: string[];
  exclude: string[];
} {
  const includePatterns: string[] = [];
  const excludePatterns: string[] = [];

  rawPatterns.forEach((pattern) => {
    let processedPattern = pattern;

    if (processedPattern.startsWith("!")) {
      excludePatterns.push(processedPattern.substring(1));
      return;
    }

   
    if (processedPattern.startsWith("/")) {
      processedPattern = processedPattern.substring(1);
    }

    if (
      !processedPattern.includes(path.sep) &&
      !processedPattern.includes("/")
    ) {
      processedPattern = `**/${processedPattern}`;
    }

    includePatterns.push(processedPattern);
  });

  return { include: includePatterns, exclude: excludePatterns };
}
