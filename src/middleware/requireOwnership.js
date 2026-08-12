// Generic ownership guard. Pass it the Mongoose model to check against;
// it assumes the resource has a `userId` field and the route has an :id param.
// Must run AFTER requireAuth, since it relies on req.user.
const requireOwnership = (Model) => async (req, res, next) => {
  try {
    const item = await Model.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: `Resource with id ${req.params.id} not found` });
    }

    if (item.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden: you do not own this resource' });
    }

    req.resource = item; // handy so the controller doesn't have to re-fetch it
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireOwnership;
