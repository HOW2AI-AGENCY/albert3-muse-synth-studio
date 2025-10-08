import fs from "fs";
import path from "path";

const repoRoot = process.cwd();
const DOC_DIRECTORIES = ["docs", "project-management"];

const REQUIRED_SECTIONS: Array<{ file: string; sections: string[] }> = [
  {
    file: path.join("docs", "README.md"),
    sections: [
      "## 🔄 Синхронизация документации",
      "### Обновление индексов",
      "### Ведение журналов",
    ],
  },
  {
    file: path.join("project-management", "NAVIGATION_INDEX.md"),
    sections: [
      "## 🔄 Синхронизация документации и журналов",
      "### Обновление индексов",
      "### Обновление журналов",
    ],
  },
];

type ValidationIssue = { file: string; message: string };

const LINK_REGEX = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;

const isExternalLink = (href: string) => {
  return /^(https?:\/\/|mailto:|tel:|data:|ftp:\/\/)/i.test(href);
};

const normalizeLinkTarget = (href: string) => {
  const [cleanHref] = href.split("#");
  return cleanHref.split("?")[0];
};

const collectMarkdownFiles = (dir: string): string[] => {
  const directoryPath = path.join(repoRoot, dir);
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(path.relative(repoRoot, entryPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(path.relative(repoRoot, entryPath));
    }
  }

  return files;
};

const validateLinks = (filePath: string): ValidationIssue[] => {
  const absolutePath = path.join(repoRoot, filePath);
  const fileContent = fs.readFileSync(absolutePath, "utf8");
  const issues: ValidationIssue[] = [];

  let match: RegExpExecArray | null;
  while ((match = LINK_REGEX.exec(fileContent)) !== null) {
    const rawHref = match[1].trim();

    if (!rawHref || rawHref.startsWith("#") || isExternalLink(rawHref)) {
      continue;
    }

    const normalized = normalizeLinkTarget(rawHref);
    if (!normalized) {
      continue;
    }

    const baseDir = path.dirname(absolutePath);
    const targetPath = rawHref.startsWith("/")
      ? path.join(repoRoot, normalized)
      : path.resolve(baseDir, normalized);

    if (!fs.existsSync(targetPath)) {
      issues.push({
        file: filePath,
        message: `Ссылка "${rawHref}" указывает на несуществующий файл или директорию`,
      });
    }
  }

  return issues;
};

const validateRequiredSections = (): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  for (const requirement of REQUIRED_SECTIONS) {
    const absolutePath = path.join(repoRoot, requirement.file);

    if (!fs.existsSync(absolutePath)) {
      issues.push({
        file: requirement.file,
        message: "Обязательный файл не найден",
      });
      continue;
    }

    const content = fs.readFileSync(absolutePath, "utf8");

    for (const section of requirement.sections) {
      if (!content.includes(section)) {
        issues.push({
          file: requirement.file,
          message: `Отсутствует обязательный раздел: "${section}"`,
        });
      }
    }
  }

  return issues;
};

const main = () => {
  const issues: ValidationIssue[] = [];

  for (const dir of DOC_DIRECTORIES) {
    const markdownFiles = collectMarkdownFiles(dir);
    for (const file of markdownFiles) {
      issues.push(...validateLinks(file));
    }
  }

  issues.push(...validateRequiredSections());

  if (issues.length > 0) {
    console.error("\u274c Проверка документации не пройдена:\n");
    for (const issue of issues) {
      console.error(`- ${issue.file}: ${issue.message}`);
    }
    console.error("\nДобавьте или исправьте указанные элементы и запустите проверку снова.");
    process.exitCode = 1;
    return;
  }

  console.log("\u2705 Документация и журналы синхронизированы: ошибок не обнаружено.");
};

main();
