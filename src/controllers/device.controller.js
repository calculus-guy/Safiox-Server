const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const Device = require('../models/Device');

/**
 * @desc    Get user's devices
 * @route   GET /api/devices
 * @access  Private
 */
const getDevices = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const query = { userId: req.user.id };
  if (type) query.type = type;

  const devices = await Device.find(query).sort({ createdAt: -1 });
  ApiResponse.ok(res, { devices });
});

/**
 * @desc    Get single device
 * @route   GET /api/devices/:id
 * @access  Private
 */
const getDeviceById = asyncHandler(async (req, res) => {
  const device = await Device.findOne({ _id: req.params.id, userId: req.user.id });
  if (!device) throw ApiError.notFound('Device not found');
  ApiResponse.ok(res, { device });
});

/**
 * @desc    Add a device
 * @route   POST /api/devices
 * @access  Private
 */
const addDevice = asyncHandler(async (req, res) => {
  const device = await Device.create({
    userId: req.user.id,
    ...req.body,
  });
  ApiResponse.created(res, { device }, 'Device added');
});

/**
 * @desc    Update a device
 * @route   PUT /api/devices/:id
 * @access  Private
 */
const updateDevice = asyncHandler(async (req, res) => {
  const device = await Device.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!device) throw ApiError.notFound('Device not found');
  ApiResponse.ok(res, { device }, 'Device updated');
});

/**
 * @desc    Delete a device
 * @route   DELETE /api/devices/:id
 * @access  Private
 */
const deleteDevice = asyncHandler(async (req, res) => {
  const device = await Device.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!device) throw ApiError.notFound('Device not found');
  ApiResponse.ok(res, null, 'Device removed');
});

module.exports = { getDevices, getDeviceById, addDevice, updateDevice, deleteDevice };
