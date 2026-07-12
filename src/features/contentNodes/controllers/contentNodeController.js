const contentNodeService = require('../services/contentNodeService');
const { success } = require('../../../utils/response');
const asyncHandler = require('../../../utils/asyncHandler');

const listContentNodes = asyncHandler(async (req, res) => {
  const result = await contentNodeService.listContentNodes(req.query);
  return success(res, { data: result });
});

const getContentNode = asyncHandler(async (req, res) => {
  const node = await contentNodeService.getNodeById(req.params.id);
  return success(res, { data: { node } });
});

const createContentNode = asyncHandler(async (req, res) => {
  const node = await contentNodeService.createContentNode(req.body, req.user.id);
  return success(res, {
    statusCode: 201,
    message: 'Content node created successfully',
    data: { node },
  });
});

const updateContentNode = asyncHandler(async (req, res) => {
  const node = await contentNodeService.updateContentNode(req.params.id, req.body);
  return success(res, {
    message: 'Content node updated successfully',
    data: { node },
  });
});

const deleteContentNode = asyncHandler(async (req, res) => {
  await contentNodeService.deleteContentNode(req.params.id);
  return success(res, { message: 'Content node deleted successfully' });
});

module.exports = {
  listContentNodes,
  getContentNode,
  createContentNode,
  updateContentNode,
  deleteContentNode,
};
