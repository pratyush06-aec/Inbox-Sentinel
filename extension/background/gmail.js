import GmailService from '../services/gmail.js';

const Gmail = {
  async listCategoryMessages(accessToken, maxResults = 20) {
    return GmailService.listCategoryMessages(accessToken, maxResults);
  },

  async getMessageMetadata(accessToken, messageId) {
    return GmailService.getMessageMetadata(accessToken, messageId);
  }
};

export default Gmail;
