// src/commands/create.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateCommand } from './create.js';
import { Scaffolder } from '../scaffolder.js';
import { Prompt } from '../ui/prompt.js';
import { Logger } from '../ui/logger.js';

vi.mock('../scaffolder.js');
vi.mock('../ui/prompt.js');
vi.mock('../ui/logger.js');

describe('CreateCommand', () => {
  let scaffolder: Scaffolder;
  let prompt: Prompt;
  let logger: Logger;
  let command: CreateCommand;

  beforeEach(() => {
    vi.clearAllMocks();

    scaffolder = new Scaffolder('/test');
    prompt = new Prompt();
    logger = new Logger('normal');
    command = new CreateCommand(scaffolder, prompt, logger);

    // Default mock implementations for new prompts
    vi.mocked(prompt.askDescription).mockResolvedValue('A description');
    vi.mocked(prompt.askOwnerEmail).mockResolvedValue('');
  });

  describe('run', () => {
    it('creates marketplace when none exists', async () => {
      vi.mocked(scaffolder.hasMarketplace).mockResolvedValue(false);
      vi.mocked(prompt.askMarketplaceName).mockResolvedValue('my-market');
      vi.mocked(prompt.askDescription).mockResolvedValue('My marketplace description');
      vi.mocked(prompt.askOwnerName).mockResolvedValue('John Doe');
      vi.mocked(prompt.askOwnerEmail).mockResolvedValue('john@example.com');
      vi.mocked(prompt.askCreatePlugin).mockResolvedValue(false);

      await command.run();

      expect(scaffolder.createMarketplace).toHaveBeenCalledWith({
        name: 'my-market',
        description: 'My marketplace description',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com'
      });
    });

    it('skips marketplace creation when one exists', async () => {
      vi.mocked(scaffolder.hasMarketplace).mockResolvedValue(true);
      vi.mocked(prompt.askPluginName).mockResolvedValue('my-plugin');
      vi.mocked(scaffolder.pluginExists).mockResolvedValue(false);

      await command.run();

      expect(scaffolder.createMarketplace).not.toHaveBeenCalled();
    });

    it('creates plugin when user confirms', async () => {
      vi.mocked(scaffolder.hasMarketplace).mockResolvedValue(false);
      vi.mocked(prompt.askMarketplaceName).mockResolvedValue('my-market');
      vi.mocked(prompt.askOwnerName).mockResolvedValue('John Doe');
      vi.mocked(prompt.askCreatePlugin).mockResolvedValue(true);
      vi.mocked(prompt.askPluginName).mockResolvedValue('my-plugin');
      vi.mocked(prompt.askDescription).mockResolvedValue('A plugin description');
      vi.mocked(scaffolder.pluginExists).mockResolvedValue(false);

      await command.run();

      expect(scaffolder.createPlugin).toHaveBeenCalledWith({
        name: 'my-plugin',
        description: 'A plugin description'
      });
      expect(scaffolder.addPluginToMarketplace).toHaveBeenCalledWith('my-plugin');
    });

    it('skips plugin creation when user declines', async () => {
      vi.mocked(scaffolder.hasMarketplace).mockResolvedValue(false);
      vi.mocked(prompt.askMarketplaceName).mockResolvedValue('my-market');
      vi.mocked(prompt.askOwnerName).mockResolvedValue('John Doe');
      vi.mocked(prompt.askCreatePlugin).mockResolvedValue(false);

      await command.run();

      expect(scaffolder.createPlugin).not.toHaveBeenCalled();
    });

    it('re-prompts when plugin name already exists', async () => {
      vi.mocked(scaffolder.hasMarketplace).mockResolvedValue(true);
      vi.mocked(prompt.askPluginName)
        .mockResolvedValueOnce('existing-plugin')
        .mockResolvedValueOnce('new-plugin');
      vi.mocked(scaffolder.pluginExists)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await command.run();

      expect(prompt.askPluginName).toHaveBeenCalledTimes(2);
      expect(scaffolder.createPlugin).toHaveBeenCalledWith({
        name: 'new-plugin',
        description: 'A description'
      });
    });
  });
});
