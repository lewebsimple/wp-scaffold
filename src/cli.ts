import { cac } from "cac";
import chalk from "chalk";
import { WpScaffold } from "./";

const cli = cac();
const { version } = require("../package.json");

// Initialize WP-Scaffold
WpScaffold.initialize({
  adminUser: process.env.WP_SCAFFOLD_ADMIN_USER || 'admin',
  adminPassword: process.env.WP_SCAFFOLD_ADMIN_PASSWORD || 'changeme',
  adminEmail: process.env.WP_SCAFFOLD_ADMIN_EMAIL || 'info@example.com',
  mysqlHost: process.env.WP_SCAFFOLD_MYSQL_HOST || 'localhost',
  mysqlUser: process.env.WP_SCAFFOLD_MYSQL_USER || 'wordpress',
  mysqlPassword: process.env.WP_SCAFFOLD_MYSQL_PASSWORD || 'changeme',
  tld: process.env.WP_SCAFFOLD_TLD || "local",
  wwwRoot: process.cwd(),
});

// Create command
cli.command("<name>", "Create WordPress site").action((name) => {
  WpScaffold.create({ name });
});

cli.help();
cli.version(version);

cli.parse();

process.on("unhandledRejection", function (error: Error) {
  console.error(chalk.red(error.message) + "\n");
  cli.outputHelp();
});
