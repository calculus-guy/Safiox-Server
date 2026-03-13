const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const Organization = require('../models/Organization');

/**
 * @desc    List nearby organizations by type with geospatial query
 * @route   GET /api/organizations
 * @access  Public
 */
const getNearbyOrganizations = asyncHandler(async (req, res) => {
  const { type, lat, lng, radius, page, limit } = req.query;
  const skip = (page - 1) * limit;

  const query = {
    verificationStatus: 'verified',
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseInt(radius, 10) || 5000,
      },
    },
  };

  if (type && type !== 'all') {
    query.type = type;
  }

  const [organizations, total] = await Promise.all([
    Organization.find(query)
      .skip(skip)
      .limit(parseInt(limit, 10))
      .select('name type email phone address location operatingHours hotlineNumbers verificationStatus stats'),
    Organization.countDocuments(query),
  ]);

  // Calculate approximate distance for each result
  const orgsWithDistance = organizations.map((org) => {
    const orgObj = org.toObject();
    const [orgLng, orgLat] = org.location.coordinates;
    const distance = calculateDistance(parseFloat(lat), parseFloat(lng), orgLat, orgLng);
    orgObj.distance = distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
    orgObj.distanceValue = distance;
    return orgObj;
  });

  ApiResponse.paginated(res, orgsWithDistance, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total,
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

/**
 * @desc    Get single organization detail
 * @route   GET /api/organizations/:id
 * @access  Public
 */
const getOrganizationById = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id)
    .select('name type email phone address location operatingHours hotlineNumbers verificationStatus branches stats');
  if (!org) throw ApiError.notFound('Organization not found');
  ApiResponse.ok(res, { organization: org });
});

/**
 * Calculate distance between two points using Haversine formula.
 * Returns distance in km.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

module.exports = { getNearbyOrganizations, getOrganizationById };
