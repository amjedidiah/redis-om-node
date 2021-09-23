import { RedisClientType } from 'redis/dist/lib/client';
import { RedisModules } from 'redis/dist/lib/commands';
import { RedisLuaScripts } from 'redis/dist/lib/lua-script';

import Schema from "../schema/schema";
import Client from "../client";
import Entity from '../entity/entity';

import { EntityData, EntityId } from '../entity/entity-types';

import Where from './where';
import WhereAnd from './where-and';
import WhereOr from './where-or';
import WhereField from './where-field';
import WhereArray from './where-array';
import WhereBoolean from './where-boolean';
import WhereNumber from './where-number';
import WhereString from './where-string';

type SubSearchFunction<TEntity extends Entity> = (search: Search<TEntity>) => Search<TEntity>

export default class Search<TEntity extends Entity> {
  private schema: Schema<TEntity>;
  private client: Client;
  private redis: RedisClientType<RedisModules, RedisLuaScripts>;

  private rootWhere?: Where;

  constructor(schema: Schema<TEntity>, client: Client) {
    this.schema = schema;
    this.client = client;
    this.redis = client.redis;
  }

  where(field: string): WhereField<TEntity> {
    return this.andWhere(field) as WhereField<TEntity>;
  }

  andWhere(field: string): WhereField<TEntity>;
  andWhere(subSearchFn: SubSearchFunction<TEntity>): Search<TEntity>;
  andWhere(fieldOrFn: string | SubSearchFunction<TEntity>): WhereField<TEntity> | Search<TEntity> {

    let where: WhereField<TEntity>;

    if (typeof fieldOrFn === 'string') {
      let field = fieldOrFn;
      where = this.createWhere(field);
  
      if (this.rootWhere === undefined) {
        this.rootWhere = where;
      } else {
        this.rootWhere = new WhereAnd(this.rootWhere, where);
      }
  
      return where;
    } else {
      let subSearchFn = fieldOrFn;

      let subSearch = subSearchFn(new Search<TEntity>(this.schema, this.client));
  
      if (subSearch.rootWhere !== undefined) {
        if (this.rootWhere === undefined) {
          this.rootWhere = subSearch.rootWhere;
        } else {
          this.rootWhere = new WhereAnd(this.rootWhere, subSearch.rootWhere);
        }
      }

      return this;
    }
  }

  orWhere(field: string): WhereField<TEntity>;
  orWhere(subSearchFn: SubSearchFunction<TEntity>): Search<TEntity>;
  orWhere(fieldOrFn: string | SubSearchFunction<TEntity>): WhereField<TEntity> | Search<TEntity> {

    let where: WhereField<TEntity>;

    if (typeof fieldOrFn === 'string') {
      let field = fieldOrFn;
      where = this.createWhere(field);
  
      if (this.rootWhere === undefined) {
        this.rootWhere = where;
      } else {
        this.rootWhere = new WhereOr(this.rootWhere, where);
      }
  
      return where;
    } else {
      let subSearchFn = fieldOrFn;

      let subSearch = subSearchFn(new Search<TEntity>(this.schema, this.client));
  
      if (subSearch.rootWhere !== undefined) {
        if (this.rootWhere === undefined) {
          this.rootWhere = subSearch.rootWhere;
        } else {
          this.rootWhere = new WhereOr(this.rootWhere, subSearch.rootWhere);
        }
      }

      return this;
    }
  }

  or(...subSearchFn: ((search: Search<TEntity>) => Search<TEntity>)[]): Search<TEntity> {
    let rootWhere: any;

    subSearchFn.forEach(fn => {
      let subSearch = fn(new Search<TEntity>(this.schema, this.client));
      if (subSearch.rootWhere !== undefined) {
        if (rootWhere === undefined) {
          rootWhere = subSearch.rootWhere;
        } else {
          rootWhere = new WhereOr(rootWhere, subSearch.rootWhere);
        }
      }
    });

    if (this.rootWhere === undefined) {
      this.rootWhere = rootWhere;
    } else {
      this.rootWhere = new WhereAnd(this.rootWhere, rootWhere);
    }

    return this;
  }

  async run(): Promise<TEntity[]> {

    let command: string[] = ['FT.SEARCH', this.schema.indexName, this.query];
    let results = await this.redis.sendCommand<any[]>(command);

    let count = this.extractCount(results);
    let ids = this.extractIds(results);
    let entities = this.extractEntities(results, ids);
    return entities;
  }

  private createWhere(field: string): WhereField<TEntity> {
    let fieldDef = this.schema.definition[field];

    if (fieldDef === undefined) throw new Error(`The field '${field}' is not part of the schema.`);

    let where: WhereField<TEntity>;

    if (fieldDef.type === 'array') {
      where = new WhereArray<TEntity>(this, field);
    } else if (fieldDef.type === 'boolean') {
      where = new WhereBoolean<TEntity>(this, field);
    } else if (fieldDef.type === 'number') {
      where = new WhereNumber<TEntity>(this, field);
    } else if (fieldDef.type === 'string') {
      where = new WhereString<TEntity>(this, field);
    } else {
      // TODO: Need to test this somehow
      // @ts-ignore: This is a trap for JavaScript
      throw new Error(`The field type of '${fieldDef.type}' is not a valid field type. Valid types include 'array', 'boolean', 'number', and 'string'.`);
    }

    return where;
  }

  get query() : string {
    if (this.rootWhere === undefined) return '*';
    return `${this.rootWhere.toString()}`;
  }

  private extractCount(results: any[]): number {
    return results[0];
  }

  private extractIds(results: any[]): string[] {
    let [, ...foundKeysAndValues] = results;
    return foundKeysAndValues
      .filter((_entry, index) => index % 2 === 0)
      .map(key => (key as string).replace(/^.*:/, ""));
  }

  private extractEntities(results: any[], ids: string[]): TEntity[] {
    let [, ...foundKeysAndValues] = results;
    return foundKeysAndValues
      .filter((_entry, index) => index % 2 !== 0)
      .map((array, index) => this.arrayToEntity(array as string[], ids[index] as EntityId));
  }

  private arrayToEntity(array: string[], id: EntityId): TEntity{
    let keys = array.filter((_entry, index) => index % 2 === 0);
    let values = array.filter((_entry, index) => index % 2 !== 0);
    
    let data: EntityData = keys.reduce((object: any, key, index) => {
      object[key] = values[index]
      return object
    }, {});
    
    return new this.schema.entityCtor(id, data);
  }
}
