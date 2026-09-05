import { z } from "zod";

export const createLegalDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  version: z.string().trim().min(1).max(50),
  effectiveDate: z.coerce.date(),
  sections: z
    .array(
      z.object({
        heading: z.string().trim().min(1).max(200),
        content: z.string().trim().min(1).max(10000),
      }),
    )
    .min(1),
});
