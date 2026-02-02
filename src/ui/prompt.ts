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
}
