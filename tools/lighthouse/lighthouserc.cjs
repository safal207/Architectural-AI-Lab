const path = require('node:path');

const profile = process.env.LIGHTHOUSE_PROFILE || 'mobile';
const target = process.env.LIGHTHOUSE_TARGET || 'local';
if (!['mobile', 'desktop'].includes(profile)) throw new Error('Unknown Lighthouse profile');
if (!['local', 'production'].includes(target)) throw new Error('Unknown Lighthouse target');

module.exports = {
  ci: {
    collect: {
      ...(target === 'production'
        ? { url: ['https://safal207.github.io/Architectural-AI-Lab/'] }
        : {
            staticDistDir: path.resolve(__dirname, '../../projects/Dubai-Luxury-Villa-AI/web-viewer/app/dist'),
            url: ['http://localhost/'],
          }),
      numberOfRuns: 3,
      settings: {
        ...(profile === 'desktop' ? { preset: 'desktop' } : {}),
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        chromeFlags: '--headless --disable-dev-shm-usage',
      },
    },
    assert: {
      assertions: {
        'http-status-code': ['error', { minScore: 1 }],
        'categories:performance': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:accessibility': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:best-practices': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:seo': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './reports',
    },
  },
};
