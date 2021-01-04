import { existsSync, lstatSync, readdirSync, rmdirSync } from "fs";
import { join } from "path";
import SAO from "sao";

const { version } = require("../package.json");

export interface WpScaffoldConfig {
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
}

export class WpScaffold {
  static config: WpScaffoldConfig;
  private static isInitialized: boolean;

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

    WpScaffold.isInitialized = true;
  }

  static checkConfig() {
    if (!WpScaffold.isInitialized) {
      throw new Error("WP-Scaffold is uninitialized");
    }
  }

  /**
   * List WordPress sites
   */
  static list(): WpSite[] {
    const isDirectory = (source: string) => lstatSync(source).isDirectory();
    const files = readdirSync(WpScaffold.config.wwwRoot).filter((name) => isDirectory(join(WpScaffold.config.wwwRoot, name)));
    return files.map((name) => new WpSite(name));
  }

  /**
   * Create WordPress site
   * @param options WordPress site creation options
   */
  static async create({ name }: WpScaffoldCreateOptions): Promise<WpSite> {
    WpScaffold.checkConfig();
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

    return wp;
  }
}
