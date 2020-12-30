const { version } = require('./package.json');

module.exports = {
  prompts() {
    return [
      {
        name: "name",
        message: "WordPress site name",
        default: this.outFolder,
      },
      {
        name: "version",
        message: "WordPress site version",
        default: version,
      },
    ];
  },
  actions() {
    return [
      {
        type: "add",
        files: "**",
      },
      {
        type: "move",
        patterns: {
          gitignore: ".gitignore",
        },
      },
    ];
  },
  async completed() {
    this.gitInit();
  },
};
