const User = require('../models/User');

/**
 * Generate a unique username from a full name.
 * e.g. "John Doe" → "johndoe" or "johndoe_4821" if taken
 */
const generateUsername = async (fullName) => {
  const base = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // remove special chars
    .slice(0, 20);

  let username = base;
  let exists = await User.findOne({ username });

  while (exists) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    username = `${base}_${suffix}`;
    exists = await User.findOne({ username });
  }

  return username;
};

module.exports = generateUsername;
