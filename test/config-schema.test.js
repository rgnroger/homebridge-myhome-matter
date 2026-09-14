'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const schema = require('../config.schema.json');

const deviceSections = ['lights', 'dimmers', 'blinds', 'advancedBlinds'];

test('seções de dispositivos começam vazias até clicar em Adicionar', () => {
  for (const section of deviceSections) {
    const definition = schema.schema.properties[section];
    assert.equal(definition.type, 'array');
    assert.equal(definition.minItems, 0);
    assert.equal(Object.hasOwn(definition, 'default'), false);
  }
});

test('mantém os botões Adicionar em todas as seções', () => {
  const layout = new Map(
    schema.layout
      .filter((entry) => typeof entry === 'object' && entry.key)
      .map((entry) => [entry.key, entry]),
  );

  for (const section of deviceSections) {
    assert.match(layout.get(section).buttonText, /^Adicionar /);
  }
});

test('exibe cada dispositivo em uma linha compacta', () => {
  const layout = new Map(
    schema.layout
      .filter((entry) => typeof entry === 'object' && entry.key)
      .map((entry) => [entry.key, entry]),
  );

  for (const section of deviceSections) {
    const row = layout.get(section).items[0];
    assert.equal(row.type, 'div');
    assert.equal(row.displayFlex, true);
    assert.equal(row['flex-direction'], 'row');
    assert.ok(row.items.every((field) => field.flex));
  }
});

test('usa caixas numéricas compactas em vez de controles deslizantes', () => {
  const numericFields = ['area', 'point', 'bus'];
  const layout = new Map(
    schema.layout
      .filter((entry) => typeof entry === 'object' && entry.key)
      .map((entry) => [entry.key, entry]),
  );

  for (const section of deviceSections) {
    const fields = new Map(
      layout.get(section).items[0].items.map((field) => [field.key, field]),
    );

    for (const field of numericFields) {
      const input = fields.get(`${section}[].${field}`);
      assert.equal(input.type, 'number');
      assert.equal(input.notitle, true);
    }
  }

  const travelTime = layout
    .get('blinds')
    .items[0]
    .items.find((field) => field.key === 'blinds[].travelTime');
  assert.equal(travelTime.type, 'number');
  assert.equal(travelTime.notitle, true);
});
