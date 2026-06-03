/**
 * Shopify GraphQL queries.
 */

const PRODUCT_FIELDS = /* GraphQL */ `
  id
  handle
  title
  description
  vendor
  productType
  tags
  createdAt
  featuredImage {
    id
    url
    altText
    width
    height
  }
  images(first: 20) {
    edges {
      node {
        id
        url
        altText
        width
        height
      }
    }
  }
  variants(first: 5) {
    edges {
      node {
        id
        title
        availableForSale
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
      }
    }
  }
  artist: metafield(namespace: "record", key: "artist") { value }
  album: metafield(namespace: "record", key: "album") { value }
  label: metafield(namespace: "record", key: "label") { value }
  releaseYear: metafield(namespace: "record", key: "release_year") { value }
  genre: metafield(namespace: "record", key: "genre") { value }
  condition: metafield(namespace: "record", key: "condition") { value }
  kArtist: metafield(namespace: "kolektt", key: "artist") { value }
  kLabel: metafield(namespace: "kolektt", key: "label") { value }
  kReleaseYear: metafield(namespace: "kolektt", key: "release_year") { value }
  kGenre: metafield(namespace: "kolektt", key: "genre") { value }
  kCondition: metafield(namespace: "kolektt", key: "media_condition") { value }
  kSleeve: metafield(namespace: "kolektt", key: "sleeve_condition") { value }
  kCatalog: metafield(namespace: "kolektt", key: "catalog_number") { value }
  kCountry: metafield(namespace: "kolektt", key: "country") { value }
  kSpeed: metafield(namespace: "kolektt", key: "speed") { value }
  kEdition: metafield(namespace: "kolektt", key: "edition") { value }
  kDiscCount: metafield(namespace: "kolektt", key: "disc_count") { value }
  kTracklist: metafield(namespace: "kolektt", key: "tracklist") { value }
`;

export const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($first: Int = 50, $after: String) {
    products(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          ${PRODUCT_FIELDS}
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const COLLECTION_PRODUCTS_QUERY = /* GraphQL */ `
  query CollectionProducts($handle: String!, $first: Int = 50, $after: String) {
    collection(handle: $handle) {
      id
      title
      handle
      products(first: $first, after: $after) {
        edges {
          node {
            ${PRODUCT_FIELDS}
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      ${PRODUCT_FIELDS}
    }
  }
`;

/**
 * Notices — Shopify Blog Articles.
 * Blog handle expected: "notices" (configurable via env).
 */
const ARTICLE_FIELDS = /* GraphQL */ `
  id
  handle
  title
  excerpt
  contentHtml
  publishedAt
  image {
    id
    url
    altText
    width
    height
  }
`;

export const NOTICES_QUERY = /* GraphQL */ `
  query Notices($blogHandle: String!, $first: Int = 30) {
    blog(handle: $blogHandle) {
      id
      title
      handle
      articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
        edges {
          node {
            ${ARTICLE_FIELDS}
          }
        }
      }
    }
  }
`;

export const NOTICE_BY_HANDLE_QUERY = /* GraphQL */ `
  query NoticeByHandle($blogHandle: String!, $articleHandle: String!) {
    blog(handle: $blogHandle) {
      articleByHandle(handle: $articleHandle) {
        ${ARTICLE_FIELDS}
      }
    }
  }
`;

/**
 * FAQ — Shopify Metaobjects of type "faq".
 */
export const FAQS_QUERY = /* GraphQL */ `
  query FAQs($type: String!, $first: Int = 100) {
    metaobjects(type: $type, first: $first) {
      edges {
        node {
          id
          handle
          fields {
            key
            value
          }
        }
      }
    }
  }
`;
