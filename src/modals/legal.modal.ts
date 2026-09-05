import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export const LEGAL_DOCUMENT_TYPES = [
  "PRIVACY_POLICY",
  "TERMS_AND_CONDITIONS",
] as const;
export type LegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];

export interface LegalSection {
  heading: string;
  content: string;
}

export interface ILegalDocument {
  _id: ObjectId;
  type: LegalDocumentType;
  title: string;
  version: string;
  effectiveDate: Date;
  sections: LegalSection[];
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const legalDocuments = (): Collection<ILegalDocument> =>
  getDB().collection<ILegalDocument>("legalDocuments");
