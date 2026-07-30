import marketplaceApi from './marketplaceApi';

const {
  buildListingPayload,
  normalizeListing,
  normalizeListings,
} = require('./listingUtils');

export const fetchListings = async () => {
  const response = await marketplaceApi.get('/listings');
  return normalizeListings(response.data);
};

export const publishListing = async (listing) => {
  const payload = buildListingPayload(listing);
  const response = await marketplaceApi.post('/listings', payload);
  const created = response.data?.listing ?? response.data?.data ?? response.data;
  return normalizeListing(created);
};
