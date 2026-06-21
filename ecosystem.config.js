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
    },
    {
      name: 'subscription-bot',
      script: 'subscription.js',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'economy-engine',
      script: 'economy.js',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
