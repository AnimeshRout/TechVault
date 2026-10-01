/**
 * SEO Component — wraps react-helmet-async for consistent meta tags
 * Usage: <SEO title="Products" description="Browse our selection..." />
 */
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'TechVault';
const DEFAULT_DESC = 'Premium tech & electronics store. Shop the latest smartphones, laptops, audio gear, and PC components at unbeatable prices.';

export default function SEO({ title, description, keywords, image, url, type = 'website', jsonLd }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Premium Tech & Electronics Store`;
  const desc = description || DEFAULT_DESC;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:site_name" content={SITE_NAME} />
      {image && <meta property="og:image" content={image} />}
      {url && <meta property="og:url" content={url} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
