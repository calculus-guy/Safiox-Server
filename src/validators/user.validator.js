const Joi = require('joi');

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  phone: Joi.string().trim(),
  avatar: Joi.string().uri().allow(''),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('safe', 'unsafe').required(),
});

const updateSettingsSchema = Joi.object({
  pushNotifications: Joi.boolean(),
  emergencyAlerts: Joi.boolean(),
  nearbyIncidents: Joi.boolean(),
  safeZoneNotifications: Joi.boolean(),
  systemUpdates: Joi.boolean(),
  darkMode: Joi.boolean(),
  language: Joi.string().valid('en', 'fr', 'es', 'ar', 'ha', 'yo', 'ig'),
  locationPermissions: Joi.boolean(),
  discreetMode: Joi.object({
    enabled: Joi.boolean(),
    pin: Joi.string().allow(''),
  }),
});

const updateSOSSettingsSchema = Joi.object({
  countdownEnabled: Joi.boolean(),
  countdownDuration: Joi.number().valid(5, 10, 15),
  silentMode: Joi.boolean(),
  voiceTrigger: Joi.boolean(),
  voiceTriggerPhrase: Joi.string().trim().max(50),
  flashlight: Joi.boolean(),
  communityRespondersEnabled: Joi.boolean(),
});

const updateFakeCallConfigSchema = Joi.object({
  callerName: Joi.string().trim().max(50),
  callerNumber: Joi.string().trim(),
  delay: Joi.number().valid(5, 10, 30),
});

const updateNotificationSettingsSchema = Joi.object({
  pushNotifications: Joi.boolean(),
  emergencyAlerts: Joi.boolean(),
  nearbyIncidents: Joi.boolean(),
  safeZoneNotifications: Joi.boolean(),
  systemUpdates: Joi.boolean(),
});

const updateDeviceTokenSchema = Joi.object({
  token: Joi.string().required(),
});

module.exports = {
  updateProfileSchema,
  updateStatusSchema,
  updateSettingsSchema,
  updateSOSSettingsSchema,
  updateFakeCallConfigSchema,
  updateNotificationSettingsSchema,
  updateDeviceTokenSchema,
};
