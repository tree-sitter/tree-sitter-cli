const assert = require('assert');
const {parseProperties, generatePropertyJSON, queryProperties} = require('..');

describe('grammar properties', () => {
  describe(".parseProperties(css)", () => {
    it('parses pseudo classes', () => {
      const css = `
        arrow_function > identifier:nth-child(0) {
          define: local;
        }
      `;

      assert.deepEqual(parseProperties(css), [
        {
          selectors: [
            [
              {type: 'arrow_function', immediate: false, named: true},
              {type: 'identifier', immediate: true, named: true, index: 0}
            ]
          ],
          properties: {define: 'local'}
        }
      ])
    })

    it('parses nested selectors', async () => {
      const css = `
        a, b {
          p: q;

          & > c > d, & e {
            p: w;
          }
        }
      `;

      assert.deepEqual(await parseProperties(css), [
        {
          selectors: [
            [
              {type: 'a', immediate: false, named: true},
            ],
            [
              {type: 'b', immediate: false, named: true},
            ]
          ],
          properties: {p: 'q'}
        },
        {
          selectors: [
            [
              {type: 'a', immediate: false, named: true},
              {type: 'c', named: true, immediate: true},
              {type: 'd', named: true, immediate: true}
            ],
            [
              {type: 'a', immediate: false, named: true},
              {type: 'e', named: true, immediate: false}
            ],
            [
              {type: 'b', immediate: false, named: true},
              {type: 'c', named: true, immediate: true},
              {type: 'd', named: true, immediate: true},
            ],
            [
              {type: 'b', immediate: false, named: true},
              {type: 'e', named: true, immediate: false}
            ]
          ],
          properties: {p: 'w'}
        }
      ])
    })
  });

  describe('.generatePropertyJSON and .queryProperties', () => {
    it('handles immediate child selectors', () => {
      const css = `
        f1 {
          color: red;

          & > f2 {
            color: green;
          }

          & f3 {
            color: blue;
          }
        }

        f2 {
          color: indigo;
          height: 2;
        }

        f3 {
          color: violet;
          height: 3;
        }
      `;

      const properties = JSON.parse(generatePropertyJSON(css));

      // f1 single-element selector
      assert.deepEqual(queryProperties(properties, ['f1']), {color: 'red'})
      assert.deepEqual(queryProperties(properties, ['f2', 'f1']), {color: 'red'})
      assert.deepEqual(queryProperties(properties, ['f2', 'f3', 'f1']), {color: 'red'})

      // f2 single-element selector
      assert.deepEqual(queryProperties(properties, ['f2']), {color: 'indigo', height: '2'})
      assert.deepEqual(queryProperties(properties, ['f2', 'f2']), {color: 'indigo', height: '2'})
      assert.deepEqual(queryProperties(properties, ['f1', 'f3', 'f2']), {color: 'indigo', height: '2'})
      assert.deepEqual(queryProperties(properties, ['f1', 'f6', 'f2']), {color: 'indigo', height: '2'})

      // f3 single-element selector
      assert.deepEqual(queryProperties(properties, ['f3']), {color: 'violet', height: '3'})
      assert.deepEqual(queryProperties(properties, ['f2', 'f3']), {color: 'violet', height: '3'})

      // f2 child selector
      assert.deepEqual(queryProperties(properties, ['f1', 'f2']), {color: 'green', height: '2'})
      assert.deepEqual(queryProperties(properties, ['f2', 'f1', 'f2']), {color: 'green', height: '2'})
      assert.deepEqual(queryProperties(properties, ['f3', 'f1', 'f2']), {color: 'green', height: '2'})

      // f3 descendant selector
      assert.deepEqual(queryProperties(properties, ['f1', 'f3']), {color: 'blue', height: '3'})
      assert.deepEqual(queryProperties(properties, ['f1', 'f2', 'f3']), {color: 'blue', height: '3'})
      assert.deepEqual(queryProperties(properties, ['f1', 'f6', 'f7', 'f8', 'f3']), {color: 'blue', height: '3'})

      // no match
      assert.deepEqual(queryProperties(properties, ['f1', 'f3', 'f4']), {})
      assert.deepEqual(queryProperties(properties, ['f1', 'f2', 'f5']), {})
    });

    it('handles the :text pseudo class', () => {
      const css = `
        f1 {
          color: red;

          &:text('^[A-Z]') {
            color: green;
          }
        }

        f2:text('^[A-Z_]+$') {
          color: purple;
        }
      `;

      const properties = JSON.parse(generatePropertyJSON(css));
      assert.deepEqual(queryProperties(properties, ['f1'], [0], 'abc'), {color: 'red'});
      assert.deepEqual(queryProperties(properties, ['f1'], [0], 'Abc'), {color: 'green'});
      assert.deepEqual(queryProperties(properties, ['f2'], [0], 'abc'), {});
      assert.deepEqual(queryProperties(properties, ['f2'], [0], 'ABC'), {color: 'purple'});
    });

    it('does not allow pseudo classes to be used without a node type', () => {
      assert.throws(() => {
        generatePropertyJSON(`:text('a') {}`)
      }, /Pseudo class ':text' must be used together with a node type/)

      assert.throws(() => {
        generatePropertyJSON(`a :text('a') {}`)
      }, /Pseudo class ':text' must be used together with a node type/)

      assert.throws(() => {
        generatePropertyJSON(`a > :nth-child(0) {}`)
      }, /Pseudo class ':nth-child' must be used together with a node type/)
    });
  });
});
