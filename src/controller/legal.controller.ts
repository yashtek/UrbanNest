import { Context } from "hono";
import { createLegalDocumentSchema } from "../validators/legal.validators";
import {
  createLegalDocument,
  getLatestLegalDocument,
} from "../service/legal.service";
import type { LegalDocumentType } from "../modals/legal.modal";

const create = (type: LegalDocumentType) => async (c: Context) => {
  const input = createLegalDocumentSchema.parse(await c.req.json());
  const document = await createLegalDocument(type, c.get("user").userId, input);
  return c.json(
    {
      success: true,
      message: "Legal document created successfully",
      data: document,
    },
    201,
  );
};

const getLatest = (type: LegalDocumentType) => async (c: Context) =>
  c.json({ success: true, data: await getLatestLegalDocument(type) });

export const createPrivacyPolicy = create("PRIVACY_POLICY");
export const createTermsAndConditions = create("TERMS_AND_CONDITIONS");
export const privacyPolicy = getLatest("PRIVACY_POLICY");
export const termsAndConditions = getLatest("TERMS_AND_CONDITIONS");
