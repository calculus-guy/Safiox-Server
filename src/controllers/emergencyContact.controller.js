const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const EmergencyContact = require('../models/EmergencyContact');

/**
 * @desc    Get all emergency contacts for current user
 * @route   GET /api/emergency-contacts
 * @access  Private
 */
const getContacts = asyncHandler(async (req, res) => {
  const contacts = await EmergencyContact.find({ userId: req.user.id }).sort({ isPrimary: -1, createdAt: -1 });
  ApiResponse.ok(res, { contacts });
});

/**
 * @desc    Add a new emergency contact
 * @route   POST /api/emergency-contacts
 * @access  Private
 */
const addContact = asyncHandler(async (req, res) => {
  const contact = await EmergencyContact.create({
    userId: req.user.id,
    ...req.body,
  });
  ApiResponse.created(res, { contact }, 'Emergency contact added');
});

/**
 * @desc    Update an emergency contact
 * @route   PUT /api/emergency-contacts/:id
 * @access  Private
 */
const updateContact = asyncHandler(async (req, res) => {
  const contact = await EmergencyContact.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!contact) throw ApiError.notFound('Contact not found');
  ApiResponse.ok(res, { contact }, 'Contact updated');
});

/**
 * @desc    Delete an emergency contact
 * @route   DELETE /api/emergency-contacts/:id
 * @access  Private
 */
const deleteContact = asyncHandler(async (req, res) => {
  const contact = await EmergencyContact.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id,
  });
  if (!contact) throw ApiError.notFound('Contact not found');
  ApiResponse.ok(res, null, 'Contact deleted');
});

module.exports = { getContacts, addContact, updateContact, deleteContact };
