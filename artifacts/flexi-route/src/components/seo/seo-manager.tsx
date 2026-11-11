import { useEffect } from 'react';
import { useLocation } from 'wouter';

const SITE = 'https://flexirouteglobal.com';
const pages: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Flexi Route | Shipping, Logistics & Shipment Tracking',
    description: 'Book shipments, explore flexible logistics services and track deliveries with Flexi Route. Get clear shipment updates and manage your deliveries in one place.',
  },
  '/about': {
    title: 'About Flexi Route | Shipping & Logistics',
    description: 'Learn about Flexi Route and our approach to shipment booking, delivery coordination and logistics services.',
  },
  '/services': {
    title: 'Shipping & Logistics Services | Flexi Route',
    description: 'Explore standard shipping, express delivery, overnight priority and freight services from Flexi Route.',
  },
  '/pricing': {
    title: 'Shipping Prices & Rates | Flexi Route',
    description: 'Review Flexi Route shipping service options and available rates before booking a delivery.',
  },
  '/track': {
    title: 'Track a Shipment | Flexi Route',
    description: 'Enter your Flexi Route tracking number to view shipment progress and delivery updates.',
  },
  '/contact': {
    title: 'Contact Flexi Route | Customer Support',
    description: 'Contact Flexi Route for help with shipment bookings, delivery questions and logistics enquiries.',
  },
  '/faq': {
    title: 'Shipping & Delivery FAQs | Flexi Route',
    description: 'Find answers to common questions about shipment booking, payments, tracking and delivery with Flexi Route.',
  },
  '/book': {
    title: 'Book a Shipment | Flexi Route',
    description: 'Start a shipment booking with Flexi Route and provide the details needed to arrange delivery.',
  },
};

function setMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function SeoManager() {
  const [location] = useLocation();

  useEffect(() => {
    const pathname = window.location.pathname.replace(/\/$/, '') || '/';
    const isShipmentDetail = /^\/track\/[^/]+$/.test(pathname);
    const isPrivate = /^\/(admin|dashboard|driver)(\/|$)/.test(pathname);
    const isAuth = pathname === '/login' || pathname === '/register';
    const page = pages[pathname];
    const isKnownPrivate = isPrivate || isAuth;
    const isIndexable = Boolean(page) && !isShipmentDetail && !isKnownPrivate;
    const title = isShipmentDetail
      ? 'Shipment Tracking Details | Flexi Route'
      : page?.title ?? 'Page Not Found | Flexi Route';
    const description = isShipmentDetail
      ? 'View shipment status and delivery updates with Flexi Route.'
      : page?.description ?? 'The requested page could not be found on Flexi Route.';
    // Public pages use a self-referencing canonical. Shipment detail URLs
    // consolidate to /track. Private/auth pages are noindex and self-canonical.
    // Unknown paths must not canonicalize to the homepage.
    const canonicalPath = isShipmentDetail ? '/track' : (page || isKnownPrivate) ? pathname : null;
    const canonical = canonicalPath
      ? `${SITE}${canonicalPath === '/' ? '/' : canonicalPath}`
      : null;

    document.title = title;
    setMeta('description', description);
    setMeta('robots', isIndexable ? 'index, follow, max-image-preview:large' : 'noindex, follow');
    setMeta('og:type', 'website', 'property');
    setMeta('og:site_name', 'Flexi Route', 'property');
    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
    if (canonical) {
      setMeta('og:url', canonical, 'property');
    } else {
      document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.remove();
    }
    setMeta('og:image', `${SITE}/og-image.svg`, 'property');
    setMeta('og:image:alt', 'Flexi Route — shipping and logistics made easier', 'property');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', `${SITE}/og-image.svg`);

    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = canonical;
    } else {
      canonicalLink?.remove();
    }

    let structuredData = document.head.querySelector<HTMLScriptElement>('#flexi-route-organization-schema');
    if (!structuredData) {
      structuredData = document.createElement('script');
      structuredData.id = 'flexi-route-organization-schema';
      structuredData.type = 'application/ld+json';
      document.head.appendChild(structuredData);
    }
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Flexi Route',
      url: SITE,
      logo: `${SITE}/favicon.svg`,
      description: 'Shipping, logistics, shipment booking and delivery tracking services.',
    });
  }, [location]);

  return null;
}
