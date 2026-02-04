/**
 * API Reference - Scalar API Reference for Next.js
 * Requirements: 12.1 - Documentation
 * @see https://scalar.com/products/api-references/integrations/nextjs
 */

import { ApiReference } from "@scalar/nextjs-api-reference"

const config = {
  url: "/api/openapi",
  theme: "default",
}

export const GET = ApiReference(config)
