const path = require('path');

module.exports = {
  resolve: {
    alias: {
      'pdfjs-dist/build/pdf.worker.entry': path.resolve(
        __dirname,
        'node_modules/pdfjs-dist/build/pdf.worker.min.js'
      ),
    },
  },
};
