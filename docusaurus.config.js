// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';
const path = require('path');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'DokuAI',
  tagline: 'AI-Powered Document to Markdown Converter',
  favicon: 'img/favicon.ico',

  url: 'https://your-site.com',
  baseUrl: '/',

  organizationName: 'SharvilDhumal', // Usually your GitHub org/user name.
  projectName: 'Intern_project1', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  clientModules: [
    require.resolve('./src/env-config.js'),
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/your-org/your-repo/edit/main/', // Change this
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/your-org/your-repo/edit/main/', // Change this
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],
  
  // Add custom routes and plugins
  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            to: '/admin-panel',
            from: ['/admin'],
          },
        ],
      },
    ],
  ],

  themeConfig: {
    image: 'img/dokuai-social-card.jpg', // Change this
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true, // disables the dark/light toggle
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'DokuAI',
      logo: {
        alt: 'DokuAI Logo',
        src: 'img/DokuAi_img.png',
      },
      items: [
        { to: '/upload', label: 'Upload', position: 'left' },
        { to: '/admin', label: 'Admin Panel', position: 'left' },
        // Custom login/logout button will be handled in Navbar/index.js
      ],
    },
    footer: {
      style: 'dark',
      copyright: `
        <div class="footer__brand-row">
          <img src="/img/DokuAI_img.png" alt="DokuAI Logo" class="footer__brand-logo" />
          <span class="footer__brand-title">DokuAI</span>
        </div>
        <div class="footer__brand-tagline">AI-Powered Document to Markdown Converter</div>
        <div class="footer__brand-social">
          <a href="https://github.com/SharvilDhumal/Intern_project1" target="_blank" rel="noopener"><i class="fab fa-github"></i></a>
          <a href="https://www.linkedin.com/in/sharvil-dhumal" target="_blank" rel="noopener"><i class="fab fa-linkedin"></i></a>
        </div>
        <div style="margin-top:1rem; font-size:0.95rem; color:#888;">&copy; 2025 DokuAI. All rights reserved.</div>
      `,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
  customFields: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
    AUTH_API_URL: process.env.AUTH_API_URL || 'http://localhost:5001/api/auth',
  },
  stylesheets: [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
  ],
  
};

export default config;