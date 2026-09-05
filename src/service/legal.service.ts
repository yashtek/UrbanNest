import { ObjectId } from "mongodb";
import { AppError } from "../middleware/error.middleware";
import {
  legalDocuments,
  type ILegalDocument,
  type LegalDocumentType,
  type LegalSection,
} from "../modals/legal.modal";

export const createLegalDocument = async (
  type: LegalDocumentType,
  userId: string,
  input: {
    title: string;
    version: string;
    effectiveDate: Date;
    sections: LegalSection[];
  },
) => {
  const duplicate = await legalDocuments().findOne({ type, version: input.version });
  if (duplicate) {
    throw new AppError("This legal document version already exists", 409);
  }

  const now = new Date();
  const document: ILegalDocument = {
    _id: new ObjectId(),
    type,
    title: input.title,
    version: input.version,
    effectiveDate: input.effectiveDate,
    sections: input.sections,
    createdBy: new ObjectId(userId),
    createdAt: now,
    updatedAt: now,
  };

  await legalDocuments().insertOne(document);
  return document;
};

export const getLatestLegalDocument = async (type: LegalDocumentType) => {
  const document = await legalDocuments().findOne(
    { type },
    { sort: { effectiveDate: -1, createdAt: -1 } },
  );

  if (!document) throw new AppError("Legal document not found", 404);
  return document;
};
