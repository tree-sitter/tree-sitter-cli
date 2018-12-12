const assert = require('assert');
const fs = require('fs');
const path = require('path');
const parseCSS = require('scss-parser').parse;
const {Validator} = require('jsonschema');
const Module = require('module')

// Test a property state machine against a node structure
// specified as an array of node types.
function queryProperties(props, nodeTypeStack, childIndexStack = [], text) {
  let stateId = 0
  for (let i = 0, {length} = nodeTypeStack; i < length; i++) {
    const nodeType = nodeTypeStack[i];
    const state = props.states[stateId];
    let found_transition = false;
    for (const transition of state.transitions) {
      if (
        (transition.type === nodeType) &&
        (transition.index == null || transition.index === childIndexStack[i]) &&
        (transition.text == null || new RegExp(transition.text).test(text))
      ) {
        stateId = transition.state_id;
        found_transition = true;
        break;
      }
    }
    if (!found_transition) {
      stateId = state.default_next_state_id
    }
    // console.log(
    //   nodeType, '->', stateId,
    //   props.property_sets[props.states[stateId].property_set_id]
    // );
  }
  return props.property_sets[props.states[stateId].property_set_id]
}

// Parse a property sheet written in CSS into the intermediate
// object structure that is passed to the `ts_compile_property_sheet`
// function.
function parseProperties(source, baseDirectory) {
  // Get the raw SCSS concrete syntax tree.
  const rawTree = parseCSS(source);
  removeWhitespace(rawTree);

  // Convert the concrete syntax tree into a more convenient AST.
  let schema
  const rootRules = []
  for (const rule of rawTree.value) {
    if (rule.type === 'atrule') {
      removeWhitespace(rule);
      const [keyword, argument] = rule.value;
      if (keyword.value === 'schema') {
        schema = visitSchema(argument, baseDirectory)
      } else if (keyword.value === 'import') {
        rootRules.push(...visitImport(argument, baseDirectory))
      }
    } else {
      rootRules.push(visitRule(rule, false))
    }
  }

  // Flatten out any nested selectors.
  const rules = []
  for (const rootRule of rootRules) {
    flattenRule(rootRule, rules, [[]]);
  }

  const validator = new Validator();

  for (const rule of rules) {
    // Validate each rule's properties against the schema.
    for (const property in rule.properties) {
      if (schema) {
        const propertySchema = schema[property]
        const value = rule.properties[property]
        if (!propertySchema) {
          throw new Error(`Property '${property}' is not present in the schema`);
        }
        const {errors} = validator.validate(value, propertySchema);
        if (errors.length > 0) {
          throw new Error(`Invalid value '${value}' for property '${property}'`)
        }
      }
    }

    rule.selectors = rule.selectors.map(applyPseudoClasses)
  }

  return rules;
}

function applyPseudoClasses(rule) {
  const result = []
  for (const entry of rule) {
    if (entry.pseudo) {
      result[result.length - 1] = Object.assign({}, result[result.length - 1], entry.pseudo)
    } else {
      result.push(entry)
    }
  }
  return result
}

function flattenRule(node, flatRules, prefixes) {
  const newSelectors = []

  for (const prefix of prefixes) {
    for (const selector of node.selectors) {
      newSelectors.push(prefix.concat(selector))
    }
  }

  flatRules.push({
    selectors: newSelectors,
    properties: node.properties
  })

  for (const childNode of node.rules || []) {
    flattenRule(childNode, flatRules, newSelectors);
  }
}

function visitSchema(argument, baseDirectory) {
  return require(resolvePath(argument, baseDirectory));
}

function visitImport(argument, baseDirectory) {
  const importPath = resolvePath(argument, baseDirectory);
  const source = fs.readFileSync(importPath, 'utf8');
  return parseProperties(source, path.dirname(importPath));
}

function resolvePath(argument, baseDirectory) {
  if (!['string_double', 'string_single'].includes(argument.type)) {
    throw new Error(`Unexpected path argument type ${argument.type}`);
  }
  if (argument.value.startsWith('.')) {
    return path.resolve(baseDirectory, argument.value);
  } else {
    return require.resolve(argument.value, {
      paths: Module._nodeModulePaths(baseDirectory)
    })
  }
}

function visitRule(tree, nested) {
  assert.equal(tree.type, 'rule');
  removeWhitespace(tree);
  assert.equal(tree.value.length, 2);
  return {
    selectors: visitSelectors(tree.value[0], nested),
    ...visitBlock(tree.value[1])
  };
}

function visitSelectors(tree, nested) {
  assert.equal(tree.type, 'selector');
  const selectors = [];
  let selector = [];
  let expectAmpersand = nested;
  for (const entry of tree.value) {
    if (entry.type === 'punctuation' && entry.value === ',') {
      assert.notEqual(selector.length, 0);
      selectors.push(visitSelector(selector, nested));
      selector = [];
      expectAmpersand = nested
    } else if (expectAmpersand) {
      if (!isWhitespace(entry)) {
        assert.equal(entry.value, '&')
        expectAmpersand = false
      }
    } else {
      selector.push(entry);
    }
  }
  assert.notEqual(selector.length, 0);
  selectors.push(visitSelector(selector, nested));
  return selectors;
}

function visitSelector(selector, nested) {
  const result = [];
  let immediate = false;
  let previousEntryWasNodeType = false;
  for (let i = 0, {length} = selector; i < length; i++) {
    const entry = selector[i];
    if (entry.type === 'operator' && entry.value === '>') {
      immediate = true
      previousEntryWasNodeType = false;
    } else if (
      entry.type === 'identifier' ||
      entry.type === 'string_double' ||
      entry.type === 'string_single'
    ) {
      let named = entry.type === 'identifier';
      result.push({
        type: entry.value,
        named,
        immediate
      });
      immediate = false
      previousEntryWasNodeType = true;
    } else if (entry.type === 'function') {
      const pseudo = entry.value[0].value[0].value;

      let hasPrecedingNodeType = (i === 0)
        ? nested
        : previousEntryWasNodeType

      if (!previousEntryWasNodeType && !(nested && i === 0)) {
        throw new Error(`Pseudo class ':${pseudo}' must be used together with a node type`)
      }

      if (pseudo === 'nth-child') {
        const args = entry.value[1];
        assert.equal(args.type, 'arguments');
        result.push({pseudo: {index: parseInt(args.value[0].value, 10)}})
      } else if (pseudo === 'text') {
        const args = entry.value[1];
        assert.equal(args.type, 'arguments');
        assert.equal(args.value.length, 1)
        result.push({pseudo: {text: args.value[0].value}})
      }
      previousEntryWasNodeType = false;
    } else {
      previousEntryWasNodeType = false;
    }
  }
  return result;
}

function visitBlock(tree) {
  assert.equal(tree.type, 'block');
  removeWhitespace(tree);
  const properties = {};
  const rules = [];
  for (const entry of tree.value) {
    if (entry.type === 'declaration') {
      const {key, value} = visitDeclaration(entry);
      if (properties[key] != null) {
        if (Array.isArray(properties[key])) {
          properties[key].push(value);
        } else {
          properties[key] = [properties[key], value];
        }
      } else {
        properties[key] = value;
      }
    } else {
      rules.push(visitRule(entry, true));
    }
  }
  return {properties, rules};
}

function visitDeclaration(tree) {
  assert.equal(tree.type, 'declaration');
  removeWhitespace(tree);
  const propertyTree = tree.value[0];
  const valueTree = tree.value[2];
  removeWhitespace(propertyTree);
  removeWhitespace(valueTree);
  assert.equal(propertyTree.type, 'property')
  assert.equal(valueTree.type, 'value')

  return {
    key: propertyTree.value[0].value,
    value: visitPropertyValue(valueTree.value[0])
  };
}

function visitPropertyValue(tree) {
  if (tree.type === 'function') {
    return visitFunctionCall(tree);
  } else if (tree.type === 'number') {
    return parseInt(tree.value);
  } else {
    return tree.value;
  }
}

function visitFunctionCall(tree) {
  assert.equal(tree.value[0].type, 'identifier');
  const name = tree.value[0].value;
  assert.equal(tree.value[1].type, 'arguments');
  const argumentsTree = tree.value[1];
  removeWhitespace(argumentsTree);

  const args = []
  for (const argumentTree of argumentsTree.value) {
    if (argumentTree.type === 'punctuation') continue;
    args.push(visitPropertyValue(argumentTree));
  }

  return {name, args}
}

// Get rid of useless nodes and properties.
function removeWhitespace(node) {
  node.value = node.value.filter(node => !isWhitespace(node))
}

function isWhitespace(node) {
  return (
    node.type === 'space' ||
    node.type === 'comment_multiline' ||
    node.type === 'comment_singleline'
  )
}

module.exports = {parseProperties, queryProperties}
