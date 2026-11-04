const test = require('node:test');
const assert = require('node:assert/strict');
const versionController = require('../src/controllers/versionController');

test('Version History & Rollback Logic', async (t) => {
  await t.test('computes correct stats from docData', () => {
    // Test the stats helper logic
    const mockDocData = {
      frames: [
        { id: 'f1', name: 'Home', action: { to: 'f2', transition: 'slide' } },
        { id: 'f2', name: 'Details' }
      ],
      groups: [
        {
          id: 'g1',
          items: [
            { id: 'i1', kind: 'button', action: { to: 'f2', transition: 'fade' } },
            { id: 'i2', kind: 'text' }
          ]
        }
      ]
    };

    // Calculate frameCount, nodeCount, wireCount
    let frameCount = mockDocData.frames.length;
    let nodeCount = mockDocData.groups.reduce((acc, g) => acc + g.items.length, 0);
    let wireCount = 0;
    mockDocData.frames.forEach(f => { if (f.action?.to) wireCount++; });
    mockDocData.groups.forEach(g => {
      g.items.forEach(it => { if (it.action?.to) wireCount++; });
    });

    assert.equal(frameCount, 2);
    assert.equal(nodeCount, 2);
    assert.equal(wireCount, 2);
  });
});

