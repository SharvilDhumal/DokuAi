// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'DokuAI',
  tagline: 'AI-Powered Documentation Conversion',
  favicon: 'img/favicon.ico',

  url: 'http://localhost:3000',
  baseUrl: '/',

  organizationName: 'your-org', // Change this
  projectName: 'dokuai', // Change this

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

  themeConfig: {
    image: 'img/dokuai-social-card.jpg', // Change this
    navbar: {
      title: 'DokuAI',
      logo: {
        alt: 'DokuAI Logo',
        src: 'img/DokuAi_img.png',
      },
      items: [
        {
          to: '/upload',
          label: 'Upload',
          position: 'left',
        },
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        { to: '/blog', label: 'Blog', position: 'left' },
        {
          href: 'https://github.com/your-org/your-repo', // Change this
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/intro', className: 'footer__link' },
            { label: 'API Reference', to: '/docs/api', className: 'footer__link' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'Discord', href: 'https://discord.gg/your-invite', className: 'footer__link' },
            { label: 'Stack Overflow', href: 'https://stackoverflow.com/questions/tagged/dokuai', className: 'footer__link' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'Blog', to: '/blog', className: 'footer__link' },
            { label: 'GitHub', href: 'https://github.com/SharvilDhumal/Intern_project1', className: 'footer__link' },
          ],
        },
      ],
      copyright:
        `<div class="footer__brand">
          <span class="footer__logo">DokuAI</span>
        </div>
        <div class="footer__copyright">© 2025 DokuAI. All rights reserved.</div>
        <div class="footer__social">
          <a href="https://github.com/SharvilDhumal/Intern_project1" target="_blank" rel="noopener" aria-label="GitHub" class="footer__social-link">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="#cccccc" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.5 2.87 8.32 6.84 9.67.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.1-1.5-1.1-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85.004 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .26.18.57.69.48A10.01 10.01 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"/></svg>
          </a>
          <a href="https://linkedin.com/" target="_blank" rel="noopener" aria-label="LinkedIn" class="footer__social-link">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="#cccccc" d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-9h3v9zm-1.5-10.28c-.97 0-1.75-.79-1.75-1.75s.78-1.75 1.75-1.75 1.75.79 1.75 1.75-.78 1.75-1.75 1.75zm15.5 10.28h-3v-4.5c0-1.08-.02-2.47-1.5-2.47-1.5 0-1.73 1.17-1.73 2.39v4.58h-3v-9h2.89v1.23h.04c.4-.75 1.38-1.54 2.84-1.54 3.04 0 3.6 2 3.6 4.59v4.72z"/></svg>
          </a>
          <a href="https://twitter.com/" target="_blank" rel="noopener" aria-label="Twitter" class="footer__social-link">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="#cccccc" d="M24 4.56c-.89.39-1.84.65-2.84.77a4.93 4.93 0 0 0 2.16-2.72c-.95.56-2.01.97-3.13 1.19a4.92 4.92 0 0 0-8.39 4.48c-4.09-.2-7.72-2.17-10.15-5.15a4.93 4.93 0 0 0-.66 2.48c0 1.71.87 3.22 2.19 4.1-.8-.03-1.56-.25-2.22-.62v.06c0 2.39 1.7 4.38 3.95 4.83-.41.11-.85.17-1.3.17-.32 0-.62-.03-.92-.08.63 1.95 2.44 3.37 4.6 3.41a9.87 9.87 0 0 1-6.1 2.1c-.4 0-.79-.02-1.18-.07a13.94 13.94 0 0 0 7.56 2.21c9.05 0 14-7.5 14-14 0-.21 0-.42-.02-.63a9.93 9.93 0 0 0 2.46-2.54z"/></svg>
          </a>
          <a href="https://youtube.com/" target="_blank" rel="noopener" aria-label="YouTube" class="footer__social-link">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="#cccccc" d="M23.5 6.5c-.28-1.04-1.1-1.86-2.14-2.14C19.09 4 12 4 12 4s-7.09 0-9.36.36C1.6 4.64.78 5.46.5 6.5.14 8.09.14 12 .14 12s0 3.91.36 5.5c.28 1.04 1.1 1.86 2.14 2.14C4.91 20 12 20 12 20s7.09 0 9.36-.36c1.04-.28 1.86-1.1 2.14-2.14.36-1.59.36-5.5.36-5.5s0-3.91-.36-5.5zM9.75 15.02V8.98l6.5 3.02-6.5 3.02z"/></svg>
          </a>
        </div>`
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
  customFields: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
  },
};

export default config;