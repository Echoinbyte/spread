import { glob } from "glob";

export const findFiles = async (
  includePatterns: string[],
  excludePatterns: string[] = []
): Promise<string[]> => {
  const allFiles: Set<string> = new Set();

  for (const pattern of includePatterns) {
    const files = await glob(pattern, { nodir: true, cwd: process.cwd() });
    files.forEach((file) => allFiles.add(file));
  }

  let filteredFiles = Array.from(allFiles);

  for (const excludePattern of excludePatterns) {
    const excluded = await glob(excludePattern, {
      nodir: true,
      cwd: process.cwd(),
    });
    const excludedSet = new Set(excluded);
    filteredFiles = filteredFiles.filter((file) => !excludedSet.has(file));
  }

  return filteredFiles;
};