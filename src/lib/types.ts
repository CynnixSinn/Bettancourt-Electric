export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export type Urgency = "Low" | "Medium" | "High";

export interface PartCost {
  partName: string;
  cost: number;
  quantity: number;
}

export interface WorkOrder {
  id: string;
  customerDetails: CustomerInfo;
  jobDescription: string;
  urgency: Urgency;
  location: string;
  status: string; // e.g., 'New', 'Analyzed', 'InvoiceGenerated', 'Scheduled'
  createdAt: Date;
  deadline?: Date;

  // Fields from voice transcription (if applicable and not fully parsed)
  voiceTranscriptionNotes?: string;

  // Fields from AI Job Analysis
  analyzedPartList?: string;
  analyzedJobDuration?: string;
  analyzedToolsNeeded?: string;
  analyzedManHours?: string;

  // Fields for Invoice Generation
  partCosts?: PartCost[];
  laborEstimate?: number;
  taxRate?: number; // e.g., 0.08 for 8%

  // Generated Invoice details
  invoiceText?: string;
  invoiceTotalAmount?: number;
}
