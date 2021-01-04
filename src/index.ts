import { execSync } from "child_process";
import { existsSync, lstatSync, readdirSync, rmdirSync } from "fs";
import { join } from "path";
import { promisify } from "util";
import SAO from "sao";
import { createConnection, Connection, QueryFunction } from "mysql";

const { version } = require("../package.json");

export interface WpScaffoldConfig {
  adminUser: string;
  adminPassword: string;
  adminEmail: string;
  mysqlHost: string;
  mysqlUser: string;
  mysqlPassword: string;
  tld: string;
  wwwRoot: string;
}

export interface WpScaffoldCreateOptions {
  name: string;
  plugins?: string[];
}

export interface WpScaffoldDeleteOptions {
  name: string;
}

export class WpSite {
  name: string;

  constructor(name: string) {
    // Validate name
    if (!name.match(/^[a-z0-9-]+$/)) {
      throw new Error(`Invalid WordPress site name (${name})`);
    }
    this.name = name;
  }

  get domain(): string {
    return `${this.name}.${WpScaffold.config.tld}`;
  }

  get path(): string {
    return join(WpScaffold.config.wwwRoot, this.name);
  }

  get dbName(): string {
    return `wp_${this.name}`;
  }

  execute(command: string): Buffer {
    return execSync(command, { cwd: this.path, stdio: "pipe" });
  }
}

export class WpScaffold {
  static config: WpScaffoldConfig;
  private static isInitialized: boolean;
  private static connection: Connection;
  private static mysqlQuery: QueryFunction;

  /**
   * Initialize WP-Scaffold
   * @param config Global WP-Scaffold configuration
   */
  static initialize(config: WpScaffoldConfig): void {
    this.config = config;

    // Validate configuration
    if (!existsSync(config.wwwRoot)) {
      throw new Error(`WP-Scaffold www root does not exist (${config.wwwRoot})`);
    }

    // Initialize MySQL connection
    this.connection = createConnection({
      host: config.mysqlHost,
      user: config.mysqlUser,
      password: config.mysqlPassword,
    });
    this.mysqlQuery = promisify(this.connection.query).bind(this.connection);

    this.isInitialized = true;
  }

  static checkConfig() {
    if (!this.isInitialized) {
      throw new Error("WP-Scaffold is uninitialized");
    }
  }

  /**
   * List WordPress sites
   */
  static list(): WpSite[] {
    const isDirectory = (source: string) => lstatSync(source).isDirectory();
    const files = readdirSync(this.config.wwwRoot).filter((name) => isDirectory(join(this.config.wwwRoot, name)));
    return files.map((name) => new WpSite(name));
  }

  /**
   * Create WordPress site
   * @param options WordPress site creation options
   */
  static async create({ name, plugins }: WpScaffoldCreateOptions): Promise<WpSite> {
    this.checkConfig();
    const wp = new WpSite(name);

    // Scaffold directory using SAO
    if (!existsSync(wp.path)) {
      await SAO({
        generator: join(__dirname, ".."),
        outDir: wp.path,
        answers: { name: wp.name, version },
      }).run();
    } else {
      throw new Error(`WordPress site already exists (${name})`);
    }

    // Install Composer dependencies
    wp.execute(`composer install`);

    // Create MySQL database
    this.mysqlQuery(`CREATE DATABASE IF NOT EXISTS ${wp.dbName}`);

    // Configure WordPress Core
    wp.execute(
      `wp core config --dbname=${wp.dbName} --dbuser=${this.config.mysqlUser} --dbpass=${this.config.mysqlPassword} --dbhost=${this.config.mysqlHost}`,
    );

    // Install WordPress
    wp.execute(
      `wp core install --url=${wp.domain} --title=${wp.name} --admin_user=${this.config.adminUser} --admin_password=${this.config.adminPassword} --admin_email=${this.config.adminEmail} --skip-email`,
    );

    return wp;
  }

  /**
   * Destroy WordPress site
   * @param options WordPress site destruction options
   */
  static async destroy({name}: WpScaffoldDeleteOptions): Promise<WpSite> {
    WpScaffold.checkConfig();
    const wp = new WpSite(name);

    // Delete directory
    if (existsSync(wp.path)) {
      rmdirSync(wp.path, { recursive: true });
    } else {
      throw new Error(`WordPress site does not exist (${name})`);
    }

    // Delete MySQL database
    WpScaffold.mysqlQuery(`DROP DATABASE IF EXISTS ${wp.dbName}`);

    return wp;
  }
}
