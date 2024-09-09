class MonoSchemaParser {
  schema;
  typeName;
  schemaPath;

  schemaParser;
  /** @type {SchemaParserFabric} */
  schemaParserFabric;
  /** @type {TypeNameFormatter} */
  typeNameFormatter;
  /** @type {SchemaComponentsMap} */
  schemaComponentsMap;
  /** @type {SchemaUtils} */
  schemaUtils;
  /** @type {CodeGenConfig} */
  config;
  /** @type {SchemaFormatters} */
  schemaFormatters;

  constructor(schemaParser, schema, typeName = null, schemaPath = []) {
    this.schemaParser = schemaParser;
    this.schemaParserFabric = schemaParser.schemaParserFabric;
    this.schema = schema;
    this.typeName = typeName;
    this.typeNameFormatter = schemaParser.typeNameFormatter;
    this.schemaPath = schemaPath;
    this.schemaComponentsMap = this.schemaParser.schemaComponentsMap;
    this.schemaUtils = this.schemaParser.schemaUtils;
    this.config = this.schemaParser.config;
    this.schemaFormatters = this.schemaParser.schemaFormatters;
  }
}

// T1 | T2
class AnyOfSchemaParser extends MonoSchemaParser {
  parse() {
    const ignoreTypes = [this.config.Ts.Keyword.Any];
    !this.schema.required && ignoreTypes.push('null');

    const combined = this.schema.anyOf.map((childSchema) =>
      this.schemaParserFabric.getInlineParseContent(
        this.schemaUtils.makeAddRequiredToChildSchema(this.schema, childSchema),
        this.schemaPath
      )
    );

    const filtered = this.schemaUtils.filterSchemaContents(
      combined,
      (content) => !ignoreTypes.includes(content)
    );

    return this.config.Ts.UnionType(filtered);
  }
}

export { AnyOfSchemaParser };
