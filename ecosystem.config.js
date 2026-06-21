module.exports = {
  apps: [
    {
      name: 'lesson-bot',
      script: 'bot.js',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'faq-bot',
      script: 'faq.js',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
