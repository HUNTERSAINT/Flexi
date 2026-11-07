import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../dist/public/', import.meta.url)));
const source = await readFile(path.join(root, 'index.html'), 'utf8');

const pages = [
  {
    route: '/',
    title: 'Flexi Route | Shipping, Logistics & Shipment Tracking',
    description: 'Book shipments, explore flexible logistics services and track deliveries with Flexi Route. Get clear shipment updates and manage your deliveries in one place.',
    indexable: true,
  },
  {
    route: '/about',
    title: 'About Flexi Route | Shipping & Logistics',
    description: 'Learn about Flexi Route and our approach to shipment booking, delivery coordination and logistics services.',
    indexable: true,
  },
  {
    route: '/services',
    title: 'Shipping & Logistics Services | Flexi Route',
    description: 'Explore standard shipping, express delivery, overnight priority and freight services from Flexi Route.',
    indexable: true,
  },
  {
    route: '/pricing',
    title: 'Shipping Prices & Rates | Flexi Route',
    description: 'Review Flexi Route shipping service options and available rates before booking a delivery.',
    indexable: true,
  },
  {
    route: '/track',
    title: 'Track a Shipment | Flexi Route',
    description: 'Enter your Flexi Route tracking number to view shipment progress and delivery updates.',
    indexable: true,
  },
  {
    route: '/contact',
    title: 'Contact Flexi Route | Customer Support',
    description: 'Contact Flexi Route for help with shipment bookings, delivery questions and logistics enquiries.',
    indexable: true,
  },
  {
    route: '/faq',
    title: 'Shipping & Delivery FAQs | Flexi Route',
    description: 'Find answers to common questions about shipment booking, payments, tracking and delivery with Flexi Route.',
    indexable: true,
  },
  {
    route: '/book',
    title: 'Book a Shipment | Flexi Route',
    description: 'Start a shipment booking with Flexi Route and provide the details needed to arrange delivery.',
    indexable: true,
  },
  {
    route: '/login',
    title: 'Login | Flexi Route',
    description: 'Sign in to your Flexi Route account.',
    indexable: false,
  },
  {
    route: '/register',
    title: 'Create an Account | Flexi Route',
    description: 'Create your Flexi Route account.',
    indexable: false,
  },
  {
    route: '/dashboard',
    title: 'Dashboard | Flexi Route',
    description: 'Manage your Flexi Route shipments.',
    indexable: false,
  },
  {
    route: '/admin',
    title: 'Administration | Flexi Route',
    description: 'Flexi Route administration.',
    indexable: false,
  },
  {
    route: '/driver',
    title: 'Driver Portal | Flexi Route',
    description: 'Flexi Route driver portal.',
    indexable: false,
  },
];

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function setTag(html, pattern, replacement) {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace('</head>', `  ${replacement}\n  </head>`);
}

function renderMetadata(page) {
  const canonical = `https://flexirouteglobal.com${page.route === '/' ? '/' : page.route}`;
  const title = escapeAttribute(page.title);
  const description = escapeAttribute(page.description);
  let html = source;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = setTag(html, /<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${description}" />`);
  html = setTag(html, /<meta name="robots" content="[^"]*"\s*\/>/, `<meta name="robots" content="${page.indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow'}" />`);
  html = setTag(html, /<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`);
  html = setTag(html, /<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`);
  html = setTag(html, /<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${title}" />`);
  html = setTag(html, /<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${description}" />`);
  html = setTag(html, /<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${title}" />`);
  html = setTag(html, /<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${description}" />`);
  return html;
}

for (const page of pages) {
  const outputDirectory = page.route === '/'
    ? root
    : path.join(root, page.route.slice(1));
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, 'index.html'), renderMetadata(page), 'utf8');
}

const publicSource = path.resolve(fileURLToPath(new URL('../public/', import.meta.url)));
for (const asset of ['sitemap.xml', 'robots.txt', 'og-image.svg']) {
  await copyFile(path.join(publicSource, asset), path.join(root, asset));
}

console.log(`Generated SEO-ready HTML entry points for ${pages.length} routes.`);
