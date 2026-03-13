const express = require('express');
const router = express.Router();
const contactController = require('../controllers/emergencyContact.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createContactSchema,
  updateContactSchema,
} = require('../validators/emergencyContact.validator');

router.use(authenticateToken);

router.get('/', contactController.getContacts);
router.post('/', validate(createContactSchema), contactController.addContact);
router.put('/:id', validate(updateContactSchema), contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;
