const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildListingPayload,
  filterListings,
  getUserId,
  isListingOwnedBy,
  normalizeListings,
} = require('../app/services/listingUtils');
const { normalizeApiBaseUrl } = require('../app/services/apiUrlUtils');

const sampleListings = [
  {
    id: 1,
    user_id: 7,
    title: 'React Native setup',
    description: 'A focused mobile build review',
    price_xmr: 0.04,
    seller_name: 'Alice',
  },
  {
    id: 2,
    user_id: '8',
    title: 'CSV cleanup',
    description: 'Deduplicate and normalize a public dataset',
    price_xmr: '0.01',
    seller_name: 'Bob',
  },
];

test('normalizes direct and wrapped listing responses', () => {
  const direct = normalizeListings(sampleListings);
  const wrapped = normalizeListings({ listings: sampleListings });

  assert.deepEqual(direct, wrapped);
  assert.equal(direct[0].id, '1');
  assert.equal(direct[0].user_id, '7');
  assert.equal(direct[1].price_xmr, 0.01);
  assert.deepEqual(normalizeListings({ unexpected: [] }), []);
});

test('searches title, description, and seller and applies inclusive price filters', () => {
  assert.deepEqual(
    filterListings(sampleListings, { query: 'alice' }).map(({ id }) => id),
    ['1']
  );
  assert.deepEqual(
    filterListings(sampleListings, { query: 'dataset' }).map(({ id }) => id),
    ['2']
  );
  assert.deepEqual(
    filterListings(sampleListings, { minPrice: '0.01', maxPrice: '0.04' }).map(
      ({ id }) => id
    ),
    ['1', '2']
  );
  assert.deepEqual(
    filterListings(sampleListings, { maxPrice: '0,02' }).map(({ id }) => id),
    ['2']
  );
});

test('builds the confirmed POST /api/listings contract', () => {
  assert.equal(
    normalizeApiBaseUrl(
      ' https://marketplace.example/api/// ',
      'http://localhost:4000/api'
    ),
    'https://marketplace.example/api'
  );
  assert.equal(
    normalizeApiBaseUrl('', 'http://localhost:4000/api/'),
    'http://localhost:4000/api'
  );
  assert.deepEqual(
    buildListingPayload({
      userId: 7,
      title: '  Mobile QA  ',
      description: '  Reproducible findings  ',
      priceXmr: '0,025',
    }),
    {
      user_id: 7,
      title: 'Mobile QA',
      description: 'Reproducible findings',
      price_xmr: 0.025,
    }
  );
});

test('rejects incomplete or non-positive listing payloads', () => {
  assert.throws(
    () =>
      buildListingPayload({
        userId: '',
        title: 'Title',
        description: 'Description',
        priceXmr: 1,
      }),
    /signed-in user/
  );
  assert.throws(
    () =>
      buildListingPayload({
        userId: 1,
        title: 'Title',
        description: 'Description',
        priceXmr: 0,
      }),
    /positive XMR/
  );
});

test('matches profile listings across numeric and string user IDs', () => {
  assert.equal(getUserId({ _id: 7 }), '7');
  assert.equal(isListingOwnedBy(sampleListings[0], { id: '7' }), true);
  assert.equal(isListingOwnedBy(sampleListings[1], { id: 7 }), false);
});
