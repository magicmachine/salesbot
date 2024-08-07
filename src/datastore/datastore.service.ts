import { Injectable, Logger } from '@nestjs/common';
import {
  RarityConfig,
  rarityRegistry,
  Wizard,
  WizardBackground,
  Soul,
  SoulTrait,
  SoulAttrName,
  Pony,
  PonyAttrName,
  Lock,
  LockAttrName,
  Beast,
  Spawn,
  Warrior,
  WarriorAttrName,
  Trait,
  Item,
  InfinityVeil,
  Ring,
  Athenaeum,
} from '../types';
import { AppConfigService } from '../config';
import wizardData from '../wizard-summary.json';
import { APIEmbedField } from 'discord.js';

@Injectable()
export class DataStoreService {
  private readonly _logger = new Logger(DataStoreService.name);

  get name(): string {
    return 'DataStoreService';
  }

  constructor(protected readonly configService: AppConfigService) {}

  /**
   * Get Item by id and symbol
   * @param id
   * @param item
   * @returns Item
   */
  public async getItem(id: string, item: string): Promise<Item> {
    switch (item) {
      case 'WARRIOR':
        return this.getWarrior(id);
      case 'WIZARD':
        return this.getWizard(id);
    }
  }

  public async getItemByContract(id: string, contract: string): Promise<Item> {
    switch (contract) {
      case this.configService.warrior.tokenContract:
        return this.getWarrior(id);
      case this.configService.wizard.tokenContract:
        return this.getWizard(id);
      case this.configService.beast.tokenContract:
        return this.getBeast(id);
      case this.configService.lock.tokenContract:
        return this.getLock(id);
      case this.configService.soul.tokenContract:
        return this.getSoul(id);
      case this.configService.spawn.tokenContract:
        return this.getSpawn(id);
      case this.configService.pony.tokenContract:
        return this.getPony(id);
      case this.configService.rings.tokenContract:
        return this.getRing(id);
      case this.configService.athenaeum.tokenContract:
        return this.getAthenaeum(id);
      case this.configService.flame.tokenContract:
        return this.getInfinityVeil(id);
    }
  }

  /**
   * Get Wizard by ID
   */
  public async getWizard(id: string): Promise<Wizard> {
    try {
      const wizardJson = wizardData.wizards[id],
        traits = [];
      let color: `#${string}`;
      for (const trait in wizardJson.traits) {
        const [name, value] = wizardJson.traits[trait].split(': ', 2);
        if (name === 'background') {
          color =`#${WizardBackground[value]}`;
        }
        traits.push({
          name: name.charAt(0).toUpperCase() + name.substring(1),
          value: value,
          rarity: wizardData.traitOccurences[wizardJson.traits[trait]],
        });
      }
      return {
        name: wizardJson.name,
        serial: id,
        nameLength: wizardJson.nameLength,
        traits: traits,
        traitCount: wizardJson.traitCount,
        backgroundColor: color,
        maxAffinity: wizardJson.maxAffinity,
        affinities: wizardJson.affinities,
      };
    } catch (error) {
      this._logger.error(error);
    }
  }

  /*
   * Get wizard fields for discord embed message
   */
  public getWizardFields(wizard: Wizard): APIEmbedField[] {
    const fields = [];

    // this is ugly
    let rarity = wizardData.traitCounts[wizard.traitCount];
    let rarityName = this.getRarityDescriptor(rarity);
    fields.push({
      name: `${rarityName} Traits`,
      value: `${wizard.traitCount} (${rarity / 100}%)`,
      inline: true,
    });

    rarity = wizardData.nameLengths[wizard.nameLength];
    rarityName = this.getRarityDescriptor(rarity);
    fields.push({
      name: `${rarityName} Name Length`,
      value: `${wizard.nameLength} (${rarity / 100}%)`,
      inline: true,
    });

    rarity = wizardData.affinityOccurences[wizard.maxAffinity];
    rarityName = this.getAffinityRarityDescriptor(rarity);
    fields.push({
      name: `${rarityName} Affinity`,
      value: `${wizard.maxAffinity} (${
        wizard.affinities[wizard.maxAffinity]
      }/${wizard.traitCount - 1} traits)`,
      inline: true,
    });

    for (const trait of wizard.traits) {
      fields.push({
        name: `${this.getRarityDescriptor(trait.rarity)} ${trait.name}`,
        value: `${trait.value} (${trait.rarity / 100}%)`,
        inline: true,
      });
    }
    return fields;
  }

  /*
   * Get rarity config for specific trait
   */
  getRarityConfig(
    rarity: number,
    getCutoff: (config: RarityConfig) => number,
  ): RarityConfig {
    const rarityConfigs: RarityConfig[] = Object.values(rarityRegistry);
    for (const config of rarityConfigs) {
      if (getCutoff(config) >= rarity) {
        return config;
      }
    }
    return rarityRegistry.common;
  }

  getRarityDescriptor(rarity: number): string {
    return this.getRarityConfig(rarity, config => config.cutoff).name;
  }

  getAffinityRarityDescriptor(rarity: number): string {
    return this.getRarityConfig(rarity, config => config.affinityCutoff).name;
  }

  /*
   * check if soul exists
   */
  public async checkSoul(id: string): Promise<boolean> {
    try {
      const url = `${this.configService.soul.dataURI}/${id}`;
      const options = {
        method: 'GET',
        headers: { Accept: 'application/json' },
      };
      const response = await fetch(url, options);
      if (response.status == 200) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      this._logger.error(err);
    }
  }

  /*
   * get soul
   */
  public async getSoul(id: string): Promise<Soul> {
    try {
      const url = `${this.configService.soul.dataURI}/${id}`;
      const options = {
        method: 'GET',
        headers: { Accept: 'application/json' },
      };
      const response = await fetch(url, options);
      const json = await response.json();

      const attrs: Array<SoulTrait> = json.attributes;
      let background: string,
        body: string,
        head: string,
        prop: string,
        familiar: string,
        traitCount: string,
        affinityCount: string,
        affinityName: string,
        transNumber: string,
        transName: string,
        undesirable: string,
        rune: string;
      const traits = [];
      for (const attr of attrs) {
        switch (attr.trait_type) {
          case SoulAttrName['Background']:
            background = attr.value;
            break;
          case SoulAttrName['Body']:
            body = attr.value;
            break;
          case SoulAttrName['Head']:
            head = attr.value;
            break;
          case SoulAttrName['Prop']:
            prop = attr.value;
            break;
          case SoulAttrName['Rune']:
            rune = attr.value;
            break;
          case SoulAttrName['Familiar']:
            familiar = attr.value;
            break;
          case SoulAttrName['Affinity']:
            affinityName = attr.value;
            break;
          case SoulAttrName['TraitsCount']:
            traitCount = attr.value;
            break;
          case SoulAttrName['TraitsAffinityCount']:
            affinityCount = attr.value;
            break;
          case SoulAttrName['TransmutedNumber']:
            transNumber = attr.value;
            break;
          case SoulAttrName['TransmutedName']:
            transName = attr.value;
            break;
          case SoulAttrName['Undesirable']:
            undesirable = attr.value;
        }
      }
      traits.push({
        name: 'Transmuted From',
        value: `[${transName}](https://opensea.io/assets/0x521f9c7505005cfa19a8e5786a9c3c9c9f5e6f42/${transNumber})`,
        inline: false,
      });
      traits.push({ name: 'Background', value: background, inline: true });
      if (!undesirable) {
        if (head) {
          traits.push({ name: 'Head', value: head, inline: true });
        }
        traits.push({ name: 'Body', value: body, inline: true });
        if (prop) {
          traits.push({ name: 'Prop', value: prop, inline: true });
        }
        if (familiar) {
          traits.push({ name: 'Familiar', value: familiar, inline: true });
        }
        if (rune) {
          traits.push({ name: 'Rune', value: rune, inline: true });
        }
        if (affinityName) {
          traits.push({
            name: 'Affinity',
            value: `${affinityName} (${affinityCount}/${traitCount})`,
            inline: true,
          });
        }
      }
      return {
        serial: id,
        name: json.name,
        backgroundColor: json.background_color,
        traits: traits,
      };
    } catch (err) {
      this._logger.error(err);
    }
  }

  /**
   * get Ring
   */
  public async getRing(id: string): Promise<Ring> {
    try {
      const url = `${this.configService.rings.dataURI}/${id}`;
      const options = {
        method: 'GET',
        headers: { Accept: 'application/json' },
      };
      const response = await fetch(url, options);
      const json = await response.json();

      return {
        serial: id,
        name: json.name,
        backgroundColor: '#000000',
        traits: [],
      };
    } catch (err) {
      this._logger.error('Error getting ring', err);
    }
  }

  /**
   * get Athenaeum
   */
  public async getAthenaeum(id: string): Promise<Athenaeum> {
    try {
      const url = `${this.configService.athenaeum.dataURI}/${id}`;
      const options = {
        method: 'GET',
        headers: { Accept: 'application/json' },
      };
      const response = await fetch(url, options);
      const json = await response.json();

      return {
        serial: id,
        name: json.name,
        backgroundColor: '#000000',
        traits: [],
      };
    } catch (err) {
      this._logger.error('Error getting athenaeum', err);
    }
  }

  /**
   * get Infinity Veil
   */
  public async getInfinityVeil(id: string): Promise<InfinityVeil> {
    try {
      const url = `${this.configService.flame.dataURI}/${id}`;
      const options = {
        method: 'GET',
        headers: { Accept: 'application/json' },
      };
      const response = await fetch(url, options);
      const json = await response.json();

      return {
        serial: id,
        name: json.name,
        backgroundColor: '#000000',
        traits: [],
      };
    } catch (err) {
      this._logger.error('Error getting infinity veil', err);
    }
  }

  /*
   * get Pony
   */
  public async getPony(id: string): Promise<Pony> {
    try {
      const url = `${this.configService.pony.dataURI}/${id}`;
      const options = {
        method: 'GET',
        headers: { Accept: 'application/json' },
      };
      const response = await fetch(url, options);
      const json = await response.json();

      const attrs: Array<Trait> = json.attributes;
      let generation: string,
        background: string,
        pony: string,
        clothes: string,
        head: string,
        rune: string,
        mouth: string;
      const traits = [];
      for (const attr of attrs) {
        switch (attr.trait_type) {
          case PonyAttrName['Generation']:
            generation = attr.value.toString();
            break;
          case PonyAttrName['Background']:
            background = attr.value;
            break;
          case PonyAttrName['Pony']:
            pony = attr.value;
            break;
          case PonyAttrName['Clothes']:
            clothes = attr.value;
            break;
          case PonyAttrName['Head']:
            head = attr.value;
            break;
          case PonyAttrName['Rune']:
            rune = attr.value;
            break;
          case PonyAttrName['Mouth']:
            mouth = attr.value;
            break;
        }
      }
      traits.push({ name: 'Generation', value: generation, inline: true });
      traits.push({ name: 'Background', value: background, inline: true });
      traits.push({ name: 'Pony', value: pony, inline: true });
      if (head) {
        traits.push({ name: 'Head', value: head, inline: true });
      }
      if (rune) {
        traits.push({ name: 'Rune', value: rune, inline: true });
      }
      if (clothes) {
        traits.push({ name: 'Clothes', value: clothes, inline: true });
      }
      if (mouth) {
        traits.push({ name: 'Mouth', value: mouth, inline: true });
      }
      return {
        serial: id,
        name: json.name,
        traits: traits,
        backgroundColor: '#000000',
      };
    } catch (err) {
      this._logger.error(err);
    }
  }

  /*
   * get Lock
   */
  public async getLock(id: string): Promise<Lock> {
    try {
      const url = `${this.configService.lock.dataURI}/${id}`;
      const options = {
        method: 'GET',
        headers: { Accept: 'application/json' },
      };
      const response = await fetch(url, options);
      if (response.status != 200) {
        return undefined;
      }
      const json = await response.json();

      const attrs: Array<Trait> = json.attributes;
      let spell: string, key: string, material: string;

      const traits = [];
      for (const attr of attrs) {
        switch (attr.trait_type) {
          case LockAttrName['Material']:
            material = attr.value;
            break;
          case LockAttrName['Key']:
            key = attr.value;
            break;
          case LockAttrName['Spell']:
            spell = attr.value;
            break;
        }
      }
      traits.push({ name: 'Material', value: material, inline: false });
      traits.push({ name: 'Key Used', value: key, inline: false });
      traits.push({ name: 'Spell Used', value: spell, inline: true });
      return {
        serial: id,
        name: json.name,
        traits: traits,
        backgroundColor: json.background,
      };
    } catch (err) {
      this._logger.error(err);
    }
  }

  /*
   * get Beast
   */
  public async getBeast(id: string): Promise<Beast> {
    try {
      const url = `${this.configService.beast.dataURI}/${id}`;
      const options = {
        method: 'GET',
        headers: { Accept: 'application/json' },
      };
      const response = await fetch(url, options);
      if (response.status != 200) {
        return undefined;
      }
      const json = await response.json();

      const attrs: Array<Trait> = json.attributes;
      const traits = [];
      for (const attr of attrs) {
        traits.push({ name: attr.trait_type, value: attr.value, inline: true });
      }
      return {
        serial: id,
        name: json.name,
        traits: traits,
        backgroundColor: json.background,
        description: json.description,
      };
    } catch (err) {
      this._logger.error(err);
    }
  }

  /*
   * get Beast Spawn
   */
  public async getSpawn(id: string): Promise<Spawn> {
    try {
      const url = `${this.configService.spawn.dataURI}/${id}`;
      const options = {
        method: 'GET',
        headers: { Accept: 'application/json' },
      };
      const response = await fetch(url, options);
      if (response.status != 200) {
        return undefined;
      }
      const json = await response.json();

      const attrs: Array<Trait> = json.attributes;
      const traits = [];
      for (const attr of attrs) {
        traits.push({ name: attr.trait_type, value: attr.value, inline: true });
      }
      traits.push({ name: 'Spawn of', value: json.group, inline: true });
      return {
        serial: id,
        name: json.name,
        traits: traits,
        backgroundColor: json.background,
      };
    } catch (err) {
      this._logger.error(err);
    }
  }

  /*
   * get Warrior
   */
  public async getWarrior(id: string): Promise<Warrior> {
    try {
      const url = `${this.configService.warrior.dataURI}/${id}`;
      const options = {
        method: 'GET',
        headers: { Accept: 'application/json' },
      };
      const response = await fetch(url, options);
      if (response.status != 200) {
        return undefined;
      }
      const json = await response.json();

      let background: string,
        companion: string,
        body: string,
        head: string,
        shield: string,
        weapon: string,
        rune: string,
        affinity: string,
        traitsCount: string,
        traitsAffinityCount: string;

      const attrs: Array<Trait> = json.attributes ? json.attributes : [];
      const traits = [];
      for (const attr of attrs) {
        switch (attr.trait_type) {
          case WarriorAttrName['Background']:
            background = attr.value;
            break;
          case WarriorAttrName['Body']:
            body = attr.value;
            break;
          case WarriorAttrName['Head']:
            head = attr.value;
            break;
          case WarriorAttrName['Weapon']:
            weapon = attr.value;
            break;
          case WarriorAttrName['Rune']:
            rune = attr.value;
            break;
          case WarriorAttrName['Shield']:
            shield = attr.value;
            break;
          case WarriorAttrName['Companion']:
            companion = attr.value;
            break;
          case WarriorAttrName['Affinity']:
            affinity = attr.value;
            break;
          case WarriorAttrName['TraitsCount']:
            traitsCount = attr.value;
            break;
          case WarriorAttrName['TraitsAffinityCount']:
            traitsAffinityCount = attr.value;
            break;
        }
      }
      traits.push({ name: 'Background', value: background, inline: true });
      traits.push({ name: 'Head', value: head, inline: true });
      traits.push({ name: 'Body', value: body, inline: true });
      traits.push({ name: 'Weapon', value: weapon, inline: true });
      if (shield) {
        traits.push({ name: 'Shield', value: shield, inline: true });
      }
      if (companion) {
        traits.push({ name: 'Companion', value: companion, inline: true });
      }
      if (rune) {
        traits.push({ name: 'Rune', value: rune, inline: true });
      }

      traits.push({
        name: 'Affinity',
        value: `${affinity} (${traitsAffinityCount}/${traitsCount})`,
        inline: true,
      });

      return {
        serial: id,
        name: json.name,
        traits: traits,
        backgroundColor: json.background_color,
      };
    } catch (err) {
      this._logger.error(err);
    }
  }
}
