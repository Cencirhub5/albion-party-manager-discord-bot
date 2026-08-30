import { Collection } from 'discord.js';
import { partyCommand } from './party.js';
import { templateCommand } from './template.js';

export const commands = new Collection<string, any>();

commands.set(partyCommand.data.name, partyCommand);
commands.set(templateCommand.data.name, templateCommand);
