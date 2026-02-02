// src/ui/prompt.ts
import inquirer from 'inquirer';
import chalk from 'chalk';
import type { DiscoveredItem } from '../types.js';

interface Choice {
  name: string;
  value: DiscoveredItem;
  checked: boolean;
}

export class Prompt {
  buildChoices(items: DiscoveredItem[]): Choice[] {
    return items.map((item) => ({
      name: `${chalk.cyan(item.type === 'marketplace' ? '[marketplace]' : '[plugin]')} ${chalk.bold(item.name)} ${chalk.gray(item.path)}`,
      value: item,
      checked: true
    }));
  }

  async selectItems(items: DiscoveredItem[]): Promise<DiscoveredItem[]> {
    if (items.length === 0) {
      return [];
    }

    if (items.length === 1) {
      return items;
    }

    const { selected } = await inquirer.prompt<{ selected: DiscoveredItem[] }>([
      {
        type: 'checkbox',
        name: 'selected',
        message: 'Select plugins/marketplaces to watch:',
        choices: this.buildChoices(items),
        validate: (answer: DiscoveredItem[]) => {
          if (answer.length === 0) {
            return 'Please select at least one item to watch.';
          }
          return true;
        }
      }
    ]);

    return selected;
  }

  async askMarketplaceName(): Promise<string> {
    const { name } = await inquirer.prompt<{ name: string }>([
      {
        type: 'input',
        name: 'name',
        message: 'Marketplace name (kebab-case):',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Name is required';
          }
          if (!/^[a-z0-9-]+$/.test(input)) {
            return 'Name must be kebab-case (lowercase letters, numbers, hyphens)';
          }
          return true;
        }
      }
    ]);
    return name;
  }

  async askOwnerName(): Promise<string> {
    const { ownerName } = await inquirer.prompt<{ ownerName: string }>([
      {
        type: 'input',
        name: 'ownerName',
        message: 'Owner name:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Owner name is required';
          }
          return true;
        }
      }
    ]);
    return ownerName;
  }

  async askPluginName(): Promise<string> {
    const { name } = await inquirer.prompt<{ name: string }>([
      {
        type: 'input',
        name: 'name',
        message: 'Plugin name (kebab-case):',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Name is required';
          }
          if (!/^[a-z0-9-]+$/.test(input)) {
            return 'Name must be kebab-case (lowercase letters, numbers, hyphens)';
          }
          return true;
        }
      }
    ]);
    return name;
  }

  async askCreatePlugin(): Promise<boolean> {
    const { createPlugin } = await inquirer.prompt<{ createPlugin: boolean }>([
      {
        type: 'confirm',
        name: 'createPlugin',
        message: 'Create a plugin now?',
        default: true
      }
    ]);
    return createPlugin;
  }

  async askOwnerEmail(): Promise<string> {
    const { email } = await inquirer.prompt<{ email: string }>([
      {
        type: 'input',
        name: 'email',
        message: 'Owner email (optional):',
      }
    ]);
    return email.trim();
  }

  async askDescription(type: 'marketplace' | 'plugin'): Promise<string> {
    const { description } = await inquirer.prompt<{ description: string }>([
      {
        type: 'input',
        name: 'description',
        message: `${type === 'marketplace' ? 'Marketplace' : 'Plugin'} description:`,
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Description is required';
          }
          return true;
        }
      }
    ]);
    return description.trim();
  }
}
