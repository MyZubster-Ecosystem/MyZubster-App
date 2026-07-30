const getUserId = (user) => {
  const value = user?.id ?? user?._id ?? user?.user_id;
  return value === undefined || value === null ? '' : String(value);
};

const normalizeListing = (listing = {}, index = 0) => {
  const userId = getUserId({
    id: listing.user_id ?? listing.userId ?? listing.user?.id ?? listing.user?._id,
  });
  const title = String(listing.title ?? '').trim();
  const rawPrice = Number(listing.price_xmr ?? listing.priceXmr ?? 0);
  const fallbackId = [userId || 'listing', title || 'untitled', index].join(':');

  return {
    ...listing,
    id: String(listing.id ?? listing._id ?? fallbackId),
    user_id: userId,
    title,
    description: String(listing.description ?? '').trim(),
    price_xmr: Number.isFinite(rawPrice) ? rawPrice : 0,
    image_url: String(listing.image_url ?? listing.imageUrl ?? '').trim(),
    seller_name: String(
      listing.seller_name ??
        listing.sellerName ??
        listing.user?.name ??
        listing.user?.username ??
        ''
    ).trim(),
  };
};

const normalizeListings = (data) => {
  const source = Array.isArray(data)
    ? data
    : Array.isArray(data?.listings)
      ? data.listings
      : Array.isArray(data?.data)
        ? data.data
        : [];

  return source.map(normalizeListing);
};

const parseXmrValue = (value) => {
  const normalized =
    typeof value === 'string' ? value.trim().replace(',', '.') : value;
  return Number(normalized);
};

const optionalPrice = (value) => {
  if (value === '' || value === undefined || value === null) {
    return null;
  }

  const price = parseXmrValue(value);
  return Number.isFinite(price) ? price : null;
};

const filterListings = (
  listings,
  { query = '', minPrice = '', maxPrice = '' } = {}
) => {
  const needle = String(query).trim().toLocaleLowerCase();
  const minimum = optionalPrice(minPrice);
  const maximum = optionalPrice(maxPrice);

  return normalizeListings(listings).filter((listing) => {
    const searchable = [
      listing.title,
      listing.description,
      listing.seller_name,
    ]
      .join(' ')
      .toLocaleLowerCase();

    return (
      (!needle || searchable.includes(needle)) &&
      (minimum === null || listing.price_xmr >= minimum) &&
      (maximum === null || listing.price_xmr <= maximum)
    );
  });
};

const buildListingPayload = ({
  userId,
  title,
  description,
  priceXmr,
  imageUrl,
}) => {
  const normalizedUserId = getUserId({ id: userId });
  const normalizedTitle = String(title ?? '').trim();
  const normalizedDescription = String(description ?? '').trim();
  const normalizedPrice = parseXmrValue(priceXmr);
  const normalizedImageUrl = String(imageUrl ?? '').trim();
  const payloadUserId = /^\d+$/.test(normalizedUserId)
    ? Number(normalizedUserId)
    : normalizedUserId;

  if (!normalizedUserId) {
    throw new Error('A signed-in user is required.');
  }
  if (!normalizedTitle) {
    throw new Error('Title is required.');
  }
  if (!normalizedDescription) {
    throw new Error('Description is required.');
  }
  if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
    throw new Error('Price must be a positive XMR amount.');
  }

  const payload = {
    user_id: payloadUserId,
    title: normalizedTitle,
    description: normalizedDescription,
    price_xmr: normalizedPrice,
  };

  if (normalizedImageUrl) {
    payload.image_url = normalizedImageUrl;
  }

  return payload;
};

const isListingOwnedBy = (listing, user) => {
  const listingUserId = getUserId({
    id: listing?.user_id ?? listing?.userId ?? listing?.user?.id,
  });
  const currentUserId = getUserId(user);
  return Boolean(currentUserId && listingUserId === currentUserId);
};

module.exports = {
  buildListingPayload,
  filterListings,
  getUserId,
  isListingOwnedBy,
  normalizeListing,
  normalizeListings,
};
