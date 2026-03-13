const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feed.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createPostSchema,
  updatePostSchema,
  feedQuerySchema,
  createCommentSchema,
  searchQuerySchema,
  forwardToAuthoritySchema,
} = require('../validators/feed.validator');

router.use(authenticateToken);

// ── Feed ──
router.get('/', validate(feedQuerySchema, 'query'), feedController.getFeed);
router.get('/search', validate(searchQuerySchema, 'query'), feedController.searchPosts);
router.post('/', validate(createPostSchema), feedController.createPost);
router.get('/:id', feedController.getPostById);
router.put('/:id', validate(updatePostSchema), feedController.updatePost);
router.delete('/:id', feedController.deletePost);

// ── Interactions ──
router.put('/:id/like', feedController.likePost);
router.put('/:id/dislike', feedController.dislikePost);
router.post('/:id/forward', validate(forwardToAuthoritySchema), feedController.forwardToAuthority);

// ── Comments ──
router.get('/:id/comments', feedController.getComments);
router.post('/:id/comments', validate(createCommentSchema), feedController.addComment);
router.delete('/:postId/comments/:commentId', feedController.deleteComment);

// ── Follow ──
router.get('/followers', feedController.getFollowers);
router.get('/following', feedController.getFollowing);
router.post('/follow/:userId', feedController.followUser);
router.delete('/follow/:userId', feedController.unfollowUser);

module.exports = router;
