const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const FeedPost = require('../models/FeedPost');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');
const Incident = require('../models/Incident');
const Notification = require('../models/Notification');
const User = require('../models/User');

// ══════════════════════════════════════════════════════
// POSTS
// ══════════════════════════════════════════════════════

/**
 * @desc    Get feed posts (all, live, or following)
 * @route   GET /api/feed
 * @access  Private
 */
const getFeed = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, filter = 'all' } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  let query = { isRemoved: { $ne: true } };

  if (filter === 'live') {
    query.isLive = true;
  } else if (filter === 'following') {
    const follows = await Follow.find({ followerId: req.user.id }).select('followingId');
    const followingIds = follows.map((f) => f.followingId);
    followingIds.push(req.user.id); // include own posts
    query.authorId = { $in: followingIds };
  }

  const [posts, total] = await Promise.all([
    FeedPost.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('authorId', 'username avatar')
      .lean(),
    FeedPost.countDocuments(query),
  ]);

  // Add interaction flags for current user
  const enrichedPosts = posts.map((post) => ({
    ...post,
    isLiked: post.likes?.some((id) => id.toString() === req.user.id),
    isDisliked: post.dislikes?.some((id) => id.toString() === req.user.id),
    likeCount: post.likes?.length || 0,
    dislikeCount: post.dislikes?.length || 0,
  }));

  ApiResponse.paginated(res, enrichedPosts, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total,
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
});

/**
 * @desc    Create a feed post
 * @route   POST /api/feed
 * @access  Private
 */
const createPost = asyncHandler(async (req, res) => {
  const { content, media, location, isLive } = req.body;

  const postData = {
    authorId: req.user.id,
    content,
    media: media || [],
    isLive: isLive || false,
  };

  if (location) {
    postData.location = {
      type: 'Point',
      coordinates: [location.longitude, location.latitude],
    };
  }

  const post = await FeedPost.create(postData);
  const populated = await FeedPost.findById(post._id).populate('authorId', 'username avatar');

  ApiResponse.created(res, { post: populated }, 'Post created');
});

/**
 * @desc    Get single post
 * @route   GET /api/feed/:id
 * @access  Private
 */
const getPostById = asyncHandler(async (req, res) => {
  const post = await FeedPost.findById(req.params.id)
    .populate('authorId', 'username avatar');
  if (!post || post.isRemoved) throw ApiError.notFound('Post not found');
  ApiResponse.ok(res, { post });
});

/**
 * @desc    Update own post
 * @route   PUT /api/feed/:id
 * @access  Private
 */
const updatePost = asyncHandler(async (req, res) => {
  const post = await FeedPost.findOne({ _id: req.params.id, authorId: req.user.id });
  if (!post) throw ApiError.notFound('Post not found');

  if (req.body.content) post.content = req.body.content;
  await post.save();

  ApiResponse.ok(res, { post }, 'Post updated');
});

/**
 * @desc    Delete own post
 * @route   DELETE /api/feed/:id
 * @access  Private
 */
const deletePost = asyncHandler(async (req, res) => {
  const post = await FeedPost.findOneAndDelete({ _id: req.params.id, authorId: req.user.id });
  if (!post) throw ApiError.notFound('Post not found');

  // Also delete associated comments
  await Comment.deleteMany({ postId: post._id });

  ApiResponse.ok(res, null, 'Post deleted');
});

/**
 * @desc    Like a post
 * @route   PUT /api/feed/:id/like
 * @access  Private
 */
const likePost = asyncHandler(async (req, res) => {
  const post = await FeedPost.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found');

  // Remove from dislikes if present
  post.dislikes = post.dislikes.filter((id) => id.toString() !== req.user.id);

  // Toggle like
  const likeIndex = post.likes.findIndex((id) => id.toString() === req.user.id);
  if (likeIndex > -1) {
    post.likes.splice(likeIndex, 1); // unlike
  } else {
    post.likes.push(req.user.id);
    // Notify author (don't notify self)
    if (post.authorId.toString() !== req.user.id) {
      const user = await User.findById(req.user.id).select('username');
      await Notification.create({
        userId: post.authorId,
        type: 'feed_like',
        title: 'New Like',
        body: `${user.username} liked your post`,
        data: { postId: post._id },
      });
    }
  }

  await post.save();
  ApiResponse.ok(res, { likeCount: post.likes.length, isLiked: likeIndex === -1 });
});

/**
 * @desc    Dislike a post
 * @route   PUT /api/feed/:id/dislike
 * @access  Private
 */
const dislikePost = asyncHandler(async (req, res) => {
  const post = await FeedPost.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found');

  // Remove from likes if present
  post.likes = post.likes.filter((id) => id.toString() !== req.user.id);

  // Toggle dislike
  const idx = post.dislikes.findIndex((id) => id.toString() === req.user.id);
  if (idx > -1) {
    post.dislikes.splice(idx, 1);
  } else {
    post.dislikes.push(req.user.id);
  }

  await post.save();
  ApiResponse.ok(res, { dislikeCount: post.dislikes.length, isDisliked: idx === -1 });
});

/**
 * @desc    Forward post to authority (create incident from post)
 * @route   POST /api/feed/:id/forward
 * @access  Private
 */
const forwardToAuthority = asyncHandler(async (req, res) => {
  const { organizationId } = req.body;
  const post = await FeedPost.findById(req.params.id).populate('authorId', 'name phone');
  if (!post) throw ApiError.notFound('Post not found');

  // Create incident from the post
  const incident = await Incident.create({
    organizationId,
    userId: req.user.id,
    userName: post.authorId.name,
    userPhone: post.authorId.phone,
    type: 'Report',
    severity: 'Medium',
    description: `Forwarded post: ${post.content}`,
    location: post.location || { type: 'Point', coordinates: [0, 0] },
    media: post.media.map((m) => m.url),
    timeline: [{ action: 'received', timestamp: new Date(), note: 'Forwarded from community feed' }],
  });

  // Update post with forward info
  post.forwardedToAuthority = {
    organizationId,
    forwardedAt: new Date(),
    incidentId: incident._id,
  };
  await post.save();

  ApiResponse.created(res, { incident }, 'Post forwarded to authority');
});

/**
 * @desc    Search posts and users
 * @route   GET /api/feed/search
 * @access  Private
 */
const searchPosts = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [posts, total, users] = await Promise.all([
    FeedPost.find({
      isRemoved: { $ne: true },
      content: { $regex: q, $options: 'i' },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('authorId', 'username avatar'),
    FeedPost.countDocuments({
      isRemoved: { $ne: true },
      content: { $regex: q, $options: 'i' },
    }),
    User.find({ username: { $regex: q, $options: 'i' } })
      .limit(10)
      .select('username avatar status role'),
  ]);

  ApiResponse.paginated(res, posts, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total,
    pages: Math.ceil(total / parseInt(limit, 10)),
    users,
  });
});

// ══════════════════════════════════════════════════════
// COMMENTS
// ══════════════════════════════════════════════════════

/**
 * @desc    Get comments for a post
 * @route   GET /api/feed/:id/comments
 * @access  Private
 */
const getComments = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    Comment.find({ postId: req.params.id, isRemoved: { $ne: true } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'username avatar'),
  ]);

  ApiResponse.paginated(res, comments, { page, limit, total, pages: Math.ceil(total / limit) });
});

/**
 * @desc    Add comment to a post
 * @route   POST /api/feed/:id/comments
 * @access  Private
 */
const addComment = asyncHandler(async (req, res) => {
  const post = await FeedPost.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found');

  const comment = await Comment.create({
    postId: req.params.id,
    authorId: req.user.id,
    content: req.body.content,
  });

  // Increment comment count
  post.commentCount = (post.commentCount || 0) + 1;
  await post.save();

  // Notify post author
  if (post.authorId.toString() !== req.user.id) {
    const user = await User.findById(req.user.id).select('username');
    await Notification.create({
      userId: post.authorId,
      type: 'feed_comment',
      title: 'New Comment',
      body: `${user.username} commented on your post`,
      data: { postId: post._id },
    });
  }

  const populated = await Comment.findById(comment._id).populate('authorId', 'username avatar');
  ApiResponse.created(res, { comment: populated }, 'Comment added');
});

/**
 * @desc    Delete own comment
 * @route   DELETE /api/feed/:postId/comments/:commentId
 * @access  Private
 */
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findOneAndDelete({
    _id: req.params.commentId,
    authorId: req.user.id,
  });
  if (!comment) throw ApiError.notFound('Comment not found');

  // Decrement comment count
  await FeedPost.findByIdAndUpdate(req.params.postId, {
    $inc: { commentCount: -1 },
  });

  ApiResponse.ok(res, null, 'Comment deleted');
});

// ══════════════════════════════════════════════════════
// FOLLOW / UNFOLLOW
// ══════════════════════════════════════════════════════

/**
 * @desc    Follow a user
 * @route   POST /api/feed/follow/:userId
 * @access  Private
 */
const followUser = asyncHandler(async (req, res) => {
  const targetUserId = req.params.userId;
  if (targetUserId === req.user.id) throw ApiError.badRequest('Cannot follow yourself');

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) throw ApiError.notFound('User not found');

  try {
    await Follow.create({ followerId: req.user.id, followingId: targetUserId });
    const user = await User.findById(req.user.id).select('username');
    await Notification.create({
      userId: targetUserId,
      type: 'feed_follow',
      title: 'New Follower',
      body: `${user.username} started following you`,
      data: { userId: req.user.id },
    });
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('Already following this user');
    throw err;
  }

  ApiResponse.ok(res, null, 'Now following user');
});

/**
 * @desc    Unfollow a user
 * @route   DELETE /api/feed/follow/:userId
 * @access  Private
 */
const unfollowUser = asyncHandler(async (req, res) => {
  const result = await Follow.findOneAndDelete({
    followerId: req.user.id,
    followingId: req.params.userId,
  });
  if (!result) throw ApiError.notFound('Not following this user');
  ApiResponse.ok(res, null, 'Unfollowed user');
});

/**
 * @desc    Get followers list
 * @route   GET /api/feed/followers
 * @access  Private
 */
const getFollowers = asyncHandler(async (req, res) => {
  const follows = await Follow.find({ followingId: req.user.id })
    .populate('followerId', 'username name avatar');
  const followers = follows.map((f) => f.followerId);
  ApiResponse.ok(res, { followers, count: followers.length });
});

/**
 * @desc    Get following list
 * @route   GET /api/feed/following
 * @access  Private
 */
const getFollowing = asyncHandler(async (req, res) => {
  const follows = await Follow.find({ followerId: req.user.id })
    .populate('followingId', 'username name avatar');
  const following = follows.map((f) => f.followingId);
  ApiResponse.ok(res, { following, count: following.length });
});

module.exports = {
  getFeed,
  createPost,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  dislikePost,
  forwardToAuthority,
  searchPosts,
  getComments,
  addComment,
  deleteComment,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
};
