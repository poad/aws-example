module.exports = {
    purge: false,
    container: {
      center: true,
    },
    darkMode: false, // or 'media' or 'class'
    theme: {
      extend: {},
    },
    variants: {
      extend: {},
    },
    plugins: [
      require("tailwindcss"),
      require("autoprefixer")
  ], 
 }
  