const purgecss = require('@fullhuman/postcss-purgecss');

module.exports = {
  plugins: [
    require('autoprefixer'),
    ...(process.env.NODE_ENV === 'production' ? [
      purgecss({
        content: [
          './src/**/*.html',
          './src/**/*.js',
          './src/**/*.jsx',
          './src/**/*.ts',
          './src/**/*.tsx',
          './public/index.html'
        ],
        defaultExtractor: content => {
          // Enhanced content extraction for React and modern JS
          const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
          const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
          return broadMatches.concat(innerMatches);
        },
        safelist: {
          // Always keep these classes
          standard: [
            'html', 'body', '#root',
            /^app/, /^smartphone/, /^dark/, /^light/,
            /^btn/, /^button/, /^input/, /^form/,
            /^modal/, /^dropdown/, /^tooltip/,
            /^loading/, /^spinner/, /^error/,
            /^success/, /^warning/, /^info/,
            /^mobile/, /^tablet/, /^desktop/,
            /^responsive/, /^hide/, /^show/,
            // Animation classes
            /^animate/, /^transition/, /^transform/,
            /^fade/, /^slide/, /^scale/, /^rotate/,
            // Dynamic classes that might be added via JS
            /^active/, /^selected/, /^focused/, /^disabled/,
            /^open/, /^closed/, /^expanded/, /^collapsed/,
            /^visible/, /^hidden/, /^opacity/,
            // CSS Grid and Flexbox utilities
            /^grid/, /^flex/, /^items/, /^justify/, /^self/,
            // Spacing utilities
            /^m[trblxy]?-/, /^p[trblxy]?-/, /^gap-/, /^space/,
            // Color utilities that might be dynamic
            /^bg-/, /^text-/, /^border-/, /^ring-/,
            // React specific classes
            /^react/, /^component/, /^container/, /^wrapper/
          ],
          // Patterns for dynamic classes
          deep: [
            /^pro-/, /^chat/, /^conversation/, /^message/,
            /^user/, /^profile/, /^avatar/, /^status/,
            /^video/, /^audio/, /^call/, /^gif/,
            /^sidebar/, /^header/, /^footer/, /^main/,
            /^search/, /^filter/, /^sort/, /^pagination/,
            /^upload/, /^download/, /^attachment/,
            /^notification/, /^badge/, /^count/,
            /^theme/, /^color/, /^size/, /^variant/
          ],
          // Greedy patterns for component libraries
          greedy: [
            /data-/, /aria-/, /role=/,
            /^hljs/, // highlight.js classes
            /^emoji/, // emoji classes  
            /^giphy/, // GIF picker classes
            /^media/, // media query classes
            /-enter/, /-leave/, /-appear/ // CSS transitions
          ]
        },
        // Don't remove keyframes, font faces, or CSS variables
        keyframes: true,
        fontFace: true,
        variables: true,
        
        // Reject function to exclude certain rules
        rejected: false, // Set to true in development for debugging
        
        // Print rejected selectors in development
        printRejected: process.env.NODE_ENV === 'development'
      })
    ] : [])
  ]
};