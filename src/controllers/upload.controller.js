const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const cloudinary = require("../config/cloudinary");

/**
 * @desc    Get signed upload parameters for direct Cloudinary upload.
 *          Frontend uses these to upload directly to Cloudinary (more efficient).
 * @route   GET /api/upload/signature
 * @access  Private
 */
const getUploadSignature = asyncHandler(async (req, res) => {
  const { folder = "safiox/general" } = req.query;

  const timestamp = Math.round(new Date().getTime() / 1000);

  // IMPORTANT: paramsToSign must contain EXACTLY the same params
  // that the frontend will send in the FormData body (excluding file,
  // api_key, resource_type, and signature itself).
  // Cloudinary validates the signature against all non-excluded params.
  const paramsToSign = {
    folder,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET,
  );

  ApiResponse.ok(
    res,
    {
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    },
    "Upload signature generated",
  );
});

/**
 * @desc    Delete a Cloudinary asset by public_id
 * @route   DELETE /api/upload
 * @access  Private
 */
const deleteUpload = asyncHandler(async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) {
    return ApiResponse.ok(res, null, "No publicId provided");
  }

  await cloudinary.uploader.destroy(publicId);
  ApiResponse.ok(res, null, "File deleted from Cloudinary");
});

module.exports = { getUploadSignature, deleteUpload };
