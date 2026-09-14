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
