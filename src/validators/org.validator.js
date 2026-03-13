const Joi = require('joi');

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

// ── Public Org Queries ──
const nearbyOrgsQuery = Joi.object({
  type: Joi.string().valid('hospital', 'police', 'fire', 'ambulance', 'other'),
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().min(100).max(50000).default(5000), // meters
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

// ── Incident Management ──
const updateIncidentStatusSchema = Joi.object({
  status: Joi.string().valid('Pending', 'Responding', 'On-Scene', 'Resolved').required(),
  outcome: Joi.string().valid('Resolved', 'Hospitalized', 'Arrest Made', 'No Action').allow(''),
  note: Joi.string().trim().max(500).allow(''),
});

const dispatchUnitSchema = Joi.object({
  unitId: Joi.string().pattern(objectIdPattern).required(),
  staffId: Joi.string().pattern(objectIdPattern),
  note: Joi.string().trim().max(500).allow(''),
});

const incidentQuerySchema = Joi.object({
  status: Joi.string().valid('Pending', 'Responding', 'On-Scene', 'Resolved', 'all').default('all'),
  type: Joi.string().valid('SOS', 'Medical', 'Fire', 'Security', 'Report', 'all').default('all'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

// ── Staff ──
const createStaffSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  role: Joi.string().valid('Responder', 'Dispatcher', 'Admin').default('Responder'),
  status: Joi.string().valid('On Duty', 'Off Duty').default('Off Duty'),
  phone: Joi.string().trim().allow(''),
  avatar: Joi.string().uri().allow(''),
});

const updateStaffSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  role: Joi.string().valid('Responder', 'Dispatcher', 'Admin'),
  status: Joi.string().valid('On Duty', 'Off Duty'),
  phone: Joi.string().trim().allow(''),
  avatar: Joi.string().uri().allow(''),
});

// ── Fleet Units ──
const createUnitSchema = Joi.object({
  unitName: Joi.string().trim().min(1).max(100).required(),
  type: Joi.string().valid('Ambulance', 'Patrol', 'Fire Truck', 'Other').required(),
  status: Joi.string().valid('Available', 'Responding', 'On-Scene', 'Offline').default('Available'),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
  }),
});

const updateUnitSchema = Joi.object({
  unitName: Joi.string().trim().min(1).max(100),
  type: Joi.string().valid('Ambulance', 'Patrol', 'Fire Truck', 'Other'),
  status: Joi.string().valid('Available', 'Responding', 'On-Scene', 'Offline'),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
  }),
});

const unitQuerySchema = Joi.object({
  status: Joi.string().valid('Available', 'Responding', 'On-Scene', 'Offline', 'all').default('all'),
});

// ── Broadcast ──
const broadcastSchema = Joi.object({
  message: Joi.string().trim().min(1).max(500).required(),
});

// ── Org Profile Update ──
const updateOrgProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200),
  phone: Joi.string().trim(),
  address: Joi.string().trim(),
  operatingHours: Joi.object({
    open: Joi.string(),
    close: Joi.string(),
    is24Hours: Joi.boolean(),
  }),
  hotlineNumbers: Joi.array().items(Joi.string().trim()),
});

module.exports = {
  nearbyOrgsQuery,
  updateIncidentStatusSchema,
  dispatchUnitSchema,
  incidentQuerySchema,
  createStaffSchema,
  updateStaffSchema,
  createUnitSchema,
  updateUnitSchema,
  unitQuerySchema,
  broadcastSchema,
  updateOrgProfileSchema,
};
