// src/commands/create.ts
import chalk from 'chalk';
import { Scaffolder } from '../scaffolder.js';
import { Prompt } from '../ui/prompt.js';
import { Logger } from '../ui/logger.js';

export class CreateCommand {
  constructor(
    private scaffolder: Scaffolder,
    private prompt: Prompt,
    private logger: Logger
  ) {}

  async run(): Promise<void> {
    const hasMarketplace = await this.scaffolder.hasMarketplace();

    if (!hasMarketplace) {
      await this.createMarketplace();

      const shouldCreatePlugin = await this.prompt.askCreatePlugin();
      if (shouldCreatePlugin) {
        await this.createPlugin();
      }
    } else {
      this.logger.info('Marketplace found. Creating plugin...');
      await this.createPlugin();
    }
  }

  private async createMarketplace(): Promise<void> {
    this.logger.info('No marketplace found. Creating one...');
    this.logger.info('');

    const name = await this.prompt.askMarketplaceName();
    const ownerName = await this.prompt.askOwnerName();

    await this.scaffolder.createMarketplace(name, ownerName);

    this.logger.success(`Created marketplace ${chalk.bold(name)}`);
    this.logger.info(`  ${chalk.gray('.claude-plugin/marketplace.json')}`);
    this.logger.info('');
  }

  private async createPlugin(): Promise<void> {
    let name = await this.prompt.askPluginName();

    while (await this.scaffolder.pluginExists(name)) {
      this.logger.error(`Plugin "${name}" already exists in marketplace`);
      name = await this.prompt.askPluginName();
    }

    await this.scaffolder.createPlugin(name);
    await this.scaffolder.addPluginToMarketplace(name);

    this.logger.success(`Created plugin ${chalk.bold(name)}`);
    this.logger.info(`  ${chalk.gray(`${name}/.claude-plugin/plugin.json`)}`);
    this.logger.info(`  ${chalk.gray(`${name}/.claude-plugin/skills/summarize-project/SKILL.md`)}`);
    this.logger.info('');
  }
}
