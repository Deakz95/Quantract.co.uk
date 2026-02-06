// Shared PostCSS config for all Next.js apps in the monorepo.
// Next.js walks up the directory tree to find postcss.config.js.
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
