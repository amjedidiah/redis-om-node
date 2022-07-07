import { EmbeddedSchema, Schema } from '$lib/schema/schema';
import { Entity } from '$lib/entity/entity';

const DEFAULT_HASH = "K0RLeeNkFtDQMdEJZfceSTXBR6Y=";

describe("Schema", () => {

  class TestEntity extends Entity {}
  class TestEmbeddedEntity extends Entity {}
  class TestDeeplyEmbeddedEntity extends Entity {}
  let schema: Schema<TestEntity>;
  let embeddedSchema: EmbeddedSchema<TestEmbeddedEntity>;
  let deeplyEmbeddedSchema: EmbeddedSchema<TestDeeplyEmbeddedEntity>;


  describe("that is empty", () => {
    beforeEach(() => {
      schema = new Schema<TestEntity>(TestEntity, {})
    });

    it("has the constructor for the entity", () => expect(schema.entityCtor).toBe(TestEntity));
    it("generates an empty Redis schema", () => expect(schema.redisSchema).toEqual([]));
    it("provides the default data structure", () => expect(schema.dataStructure).toBe("JSON"));
    it("generates the keyspace prefix from the entity constructor name", () => expect(schema.prefix).toBe("TestEntity"));
    it("generates the index name from the entity constructor name", () => expect(schema.indexName).toBe("TestEntity:index"));
    it("generates the index hash name from the entity constructor name", () => expect(schema.indexHashName).toBe("TestEntity:index:hash"));
    it("generates default Redis IDs", () => expect(schema.generateId()).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/));
    it("generates the index hash", () => expect(schema.indexHash).toBe(DEFAULT_HASH));
    it('indexes fields by default', () => expect(schema.indexedDefault).toBe(true))

    it("provides the default stop word settings", () => {
      expect(schema.useStopWords).toBe('DEFAULT')
      expect(schema.stopWords).toEqual([])
    });
  });

  describe("that doesn't index fields by default", () => {
    it("does index a field that is explicitly indexed", () => {
      schema = new Schema<TestEntity>(TestEntity, {
        aString: { type: 'string', indexed: true },
      }, {
        indexedDefault: false,
        dataStructure: 'HASH',
      })
      expect(schema.redisSchema).toEqual(['aString', 'TAG', 'SEPARATOR', '|'])
    })

    it("doesn't index a field that isn't explicitly indexed", () => {
      schema = new Schema<TestEntity>(TestEntity, {
        aString: { type: 'string' },
      }, {
        indexedDefault: false,
        dataStructure: 'HASH',
      })
      expect(schema.redisSchema).toEqual(['aString', 'TAG', 'SEPARATOR', '|', 'NOINDEX'])
    })
  });

  describe("that is well populated", () => {
    beforeEach(() => {
      schema = new Schema<TestEntity>(TestEntity, {
        aString: { type: 'string' }, anotherString: { type: 'string' },
        someText: { type: 'text' }, someOtherText: { type: 'text' },
        aNumber: { type: 'number' }, anotherNumber: { type: 'number' },
        aBoolean: { type: 'boolean' }, anotherBoolean: { type: 'boolean' },
        aPoint: { type: 'point' }, anotherPoint: { type: 'point' },
        aDate: { type: 'date' }, anotherDate: { type: 'date' },
        someStrings: { type: 'string[]' }, someOtherStrings: { type: 'string[]' }
      })
    });

    it("generates the expected Redis schema", () => expect(schema.redisSchema).toEqual([
      '$.aString', 'AS', 'aString', 'TAG', 'SEPARATOR', '|',
      '$.anotherString', 'AS', 'anotherString', 'TAG', 'SEPARATOR', '|',
      '$.someText', 'AS', 'someText', 'TEXT',
      '$.someOtherText', 'AS', 'someOtherText', 'TEXT',
      '$.aNumber', 'AS', 'aNumber', 'NUMERIC',
      '$.anotherNumber', 'AS', 'anotherNumber', 'NUMERIC',
      '$.aBoolean', 'AS', 'aBoolean', 'TAG',
      '$.anotherBoolean', 'AS', 'anotherBoolean', 'TAG',
      '$.aPoint', 'AS', 'aPoint', 'GEO',
      '$.anotherPoint', 'AS', 'anotherPoint', 'GEO',
      '$.aDate', 'AS', 'aDate', 'NUMERIC',
      '$.anotherDate', 'AS', 'anotherDate', 'NUMERIC',
      '$.someStrings[*]', 'AS', 'someStrings', 'TAG', 'SEPARATOR', '|',
      '$.someOtherStrings[*]', 'AS', 'someOtherStrings', 'TAG', 'SEPARATOR', '|'
    ]));
    it("generates the index hash", () => expect(schema.indexHash).toBe("FCn3hUMMT6KGKK+lLg300S/yJCg="));
  });

  describe("that is deeply populated", () => {

    beforeEach(() => {
      deeplyEmbeddedSchema = new EmbeddedSchema<TestDeeplyEmbeddedEntity>(TestDeeplyEmbeddedEntity, {
        aNumber: { type: 'number' },
        aString: { type: 'string' },
        someText: { type: 'text' }
      })

      embeddedSchema = new EmbeddedSchema<TestEmbeddedEntity>(TestEmbeddedEntity, {
        aNumber: { type: 'number' },
        aString: { type: 'string' },
        someText: { type: 'text' },
        aDeeperObject: { type: 'object', schema: deeplyEmbeddedSchema }
      })

      schema = new Schema<TestEntity>(TestEntity, {
        aString: { type: 'string' }, anotherString: { type: 'string' },
        someText: { type: 'text' }, someOtherText: { type: 'text' },
        aNumber: { type: 'number' }, anotherNumber: { type: 'number' },
        aBoolean: { type: 'boolean' }, anotherBoolean: { type: 'boolean' },
        aPoint: { type: 'point' }, anotherPoint: { type: 'point' },
        aDate: { type: 'date' }, anotherDate: { type: 'date' },
        someStrings: { type: 'string[]' }, someOtherStrings: { type: 'string[]' },
        anObject: { type: 'object', schema: embeddedSchema }
      })
    });

    it("generates the expected Redis schema", () => expect(schema.redisSchema).toEqual([
      '$.aString', 'AS', 'aString', 'TAG', 'SEPARATOR', '|',
      '$.anotherString', 'AS', 'anotherString', 'TAG', 'SEPARATOR', '|',
      '$.someText', 'AS', 'someText', 'TEXT',
      '$.someOtherText', 'AS', 'someOtherText', 'TEXT',
      '$.aNumber', 'AS', 'aNumber', 'NUMERIC',
      '$.anotherNumber', 'AS', 'anotherNumber', 'NUMERIC',
      '$.aBoolean', 'AS', 'aBoolean', 'TAG',
      '$.anotherBoolean', 'AS', 'anotherBoolean', 'TAG',
      '$.aPoint', 'AS', 'aPoint', 'GEO',
      '$.anotherPoint', 'AS', 'anotherPoint', 'GEO',
      '$.aDate', 'AS', 'aDate', 'NUMERIC',
      '$.anotherDate', 'AS', 'anotherDate', 'NUMERIC',
      '$.someStrings[*]', 'AS', 'someStrings', 'TAG', 'SEPARATOR', '|',
      '$.someOtherStrings[*]', 'AS', 'someOtherStrings', 'TAG', 'SEPARATOR', '|',
      '$.anObject.aNumber', 'AS', 'anObject.aNumber', 'NUMERIC',
      '$.anObject.aString', 'AS', 'anObject.aString', 'TAG', 'SEPARATOR', '|',
      '$.anObject.someText', 'AS', 'anObject.someText', 'TEXT',
      '$.anObject.aDeeperObject.aNumber', 'AS', 'anObject.aDeeperObject.aNumber', 'NUMERIC',
      '$.anObject.aDeeperObject.aString', 'AS', 'anObject.aDeeperObject.aString', 'TAG', 'SEPARATOR', '|',
      '$.anObject.aDeeperObject.someText', 'AS', 'anObject.aDeeperObject.someText', 'TEXT'
    ]));
    it("generates the index hash", () => expect(schema.indexHash).toBe("Ilbpz9vd8dg0xiRKAqUVKnXvd6s="));
  });

  describe("that overrides the data structure to be JSON", () => {
    beforeEach(() => {
      schema = new Schema<TestEntity>(TestEntity, {}, { dataStructure: 'JSON' })
    });
    it("provides a JSON data structure", () => expect(schema.dataStructure).toBe("JSON"));
    it("doesn't affect the index hash", () => expect(schema.indexHash).toBe(DEFAULT_HASH));
  });

  describe("that overrides the data structure to be HASH", () => {
    beforeEach(() => {
      schema = new Schema<TestEntity>(TestEntity, {}, { dataStructure: 'HASH' })
    });
    it("provides a HASH data structure", () => expect(schema.dataStructure).toBe("HASH"));
    it("generates the index hash", () => expect(schema.indexHash).toBe("0XK4eP9dOGP2TjBX/+MSVc5homU="));
  });

  describe("that overrides the keyspace prefix", () => {
    beforeEach(() => {
      schema = new Schema<TestEntity>(TestEntity, {}, { prefix: 'test-prefix' })
    });
    it("generates the keyspace prefix from the configuration", () => expect(schema.prefix).toBe("test-prefix"));
    it("generates the index name from the configured prefix", () => expect(schema.indexName).toBe("test-prefix:index"));
    it("generates the index hash name from the configured prefix", () => expect(schema.indexHashName).toBe("test-prefix:index:hash"));
    it("generates the index hash", () => expect(schema.indexHash).toBe("t6JEOCwFKVYMbkWE5lmnRNt8+WQ="));
  });

  describe("that overrides the index name", () => {
    beforeEach(() => {
      schema = new Schema<TestEntity>(TestEntity, {}, { indexName: 'test-index' })
    });
    it("generates the index name from the configured index name, ignoring the prefix", () => expect(schema.indexName).toBe("test-index"));
    it("generates the index hash", () => expect(schema.indexHash).toBe("PZ5pBuwmeXeeCpM9G7GIsTMRMVE="));
  });

  describe("that overrides the index hash name", () => {
    beforeEach(() => {
      schema = new Schema<TestEntity>(TestEntity, {}, { indexHashName: 'test-index-hash' })
    });
    it("generates the index hash name from the configured index hash name, ignoring the prefix", () => expect(schema.indexHashName).toBe("test-index-hash"));
    it("generates the index hash", () => expect(schema.indexHash).toBe("i1XCYozQ08UZuj+P8Tri8OiFBRs="));
  });

  describe("that overrides the id generation strategy", () => {
    beforeEach(() => {
      schema = new Schema<TestEntity>(TestEntity, {}, { idStrategy: () => '1' })
    });
    it("generates Redis IDs from the strategy", () => expect(schema.generateId()).toBe('1'));
    it("doesn't affect the index hash", () => expect(schema.indexHash).toBe(DEFAULT_HASH));
  });

  describe("that disables stop words", () => {
    beforeEach(() => {
      schema = new Schema<TestEntity>(TestEntity, {}, { useStopWords: 'OFF' })
    });
    it("provides the stop words option", () => expect(schema.useStopWords).toBe('OFF'));
    it("generates the index hash", () => expect(schema.indexHash).toBe("flTsd1eJKt/osPUJzKxr97Gi61Y="));
  });

  describe("that uses default stop words", () => {
    beforeEach(() => {
      schema = new Schema<TestEntity>(TestEntity, {}, { useStopWords: 'DEFAULT' })
    });
    it("provides the stop words option", () => expect(schema.useStopWords).toBe('DEFAULT'));
    it("doesn't affect the index hash", () => expect(schema.indexHash).toBe(DEFAULT_HASH));
  });

  describe("that uses custom stop words", () => {
    beforeEach(() => {
      schema = new Schema<TestEntity>(TestEntity, {}, { useStopWords: 'CUSTOM' })
    });
    it("provides the stop words option", () => expect(schema.useStopWords).toBe('CUSTOM'));
    it("generates the index hash", () => expect(schema.indexHash).toBe("AJRVRK7f6gjie488EEtscXoEi24="));
  });

  describe("that sets custom stop words", () => {
    beforeEach(() => {
      schema = new Schema<TestEntity>(TestEntity, {}, { stopWords: ['foo', 'bar', 'baz'] })
    });
    it("provides the custom stop words", () => expect(schema.stopWords).toEqual(['foo', 'bar', 'baz']));
    it("generates the index hash", () => expect(schema.indexHash).toBe("B7BDTY/1KcpMPaH84IPLCOzwUMM="));
  });

  describe("that is misconfigured", () => {
    it("throws an exception when the type is missing on a field definition", () =>
      // @ts-ignore: JavaScript test
      expect(() => new Schema<TestEntity>(TestEntity, { aField: {} }))
        .toThrow("The field 'aField' is configured with a type of 'undefined'. Valid types include 'boolean', 'date', 'number', 'object', 'point', 'string', 'string[]', and 'text'."));

    it("throws an exception when the type is invalid on a field definition", () =>
      // @ts-ignore: JavaScript test
      expect(() => new Schema<TestEntity>(TestEntity, { aField: { type: 'foo' } }))
        .toThrow("The field 'aField' is configured with a type of 'foo'. Valid types include 'boolean', 'date', 'number', 'object', 'point', 'string', 'string[]', and 'text'."));

    it("throws an exception when the data structure is invalid", () => {
      // @ts-ignore: JavaScript test
      expect(() => new Schema<TestEntity>(TestEntity, {}, { dataStructure: 'FOO' }))
        .toThrow("'FOO' in an invalid data structure. Valid data structures are 'HASH' and 'JSON'.");
    });

    it("throws an exception when use stop words are invalid", () => {
      // @ts-ignore: JavaScript test
      expect(() => new Schema<TestEntity>(TestEntity, {}, { useStopWords: 'FOO' }))
        .toThrow("'FOO' in an invalid value for stop words. Valid values are 'OFF', 'DEFAULT', and 'CUSTOM'.");
    });

    it("throws an exception when keyspace prefix is empty", () =>
      expect(() => new Schema<TestEntity>(TestEntity, {}, { prefix: '' }))
        .toThrow("Prefix must be a non-empty string."));

    it("throws an exception when index name is empty", () =>
      expect(() => new Schema<TestEntity>(TestEntity, {}, { indexName: '' }))
        .toThrow("Index name must be a non-empty string."));

    it("throws an exception when ID strategy is not a function", () =>
      // @ts-ignore: JavaScript test
      expect(() => new Schema<TestEntity>(TestEntity, {}, { idStrategy: 'NOT A FUNCTION' }))
        .toThrow("ID strategy must be a function that takes no arguments and returns a string."));
  });
});
