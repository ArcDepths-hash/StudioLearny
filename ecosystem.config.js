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
      name: 'apply-bot',
      script: 'apply.js',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
