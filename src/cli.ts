import { cac } from "cac";
import chalk from "chalk";
import { WpScaffold } from "./";

const cli = cac();
const { version } = require("../package.json");

// Initialize WP-Scaffold
WpScaffold.initialize({
  tld: process.env.WP_SCAFFOLD_TLD || "local",
  wwwRoot: process.cwd(),
});

// Create command
cli.command("<name>", "Create WordPress site").action((name) => {
  WpScaffold.create({ name, plugins: [] });
});

cli.help();
cli.version(version);

cli.parse();

process.on("unhandledRejection", function (error: Error) {
  console.error(chalk.red(error.message) + "\n");
  cli.outputHelp();
});
