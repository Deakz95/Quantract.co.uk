/** Lean list item from GET /api/engineer/jobs */
export type JobListItem = {
  id: string;
  jobNumber: number | null;
  title: string | null;
  status: string;
  scheduledAtISO: string | null;
  clientName: string | null;
  siteName: string | null;
  siteAddress: string | null;
};

/** Full detail from GET /api/engineer/jobs/[jobId] */
export type JobDetail = {
  id: string;
  jobNumber: number | null;
  title: string | null;
  status: string;
  scheduledAtISO: string | null;
  notes: string | null;
  stockConsumedAtISO: string | null;
  budgetTotal: number;
  client: { name: string; email: string | null; phone: string | null } | null;
  site: {
    name: string;
    address1: string | null;
    city: string | null;
    postcode: string | null;
  } | null;
};

export type JobStage = {
  id: string;
  name: string;
  status: string;
  sortOrder: number;
};

export type JobVariation = {
  id: string;
  title: string;
  status: string;
  total: number;
  stageName: string | null;
};

export type JobCert = {
  id: string;
  type: string;
  status: string;
  certificateNumber: string | null;
  completedAtISO: string | null;
  updatedAtISO: string | null;
  documentId: string | null;
  externalUrl: string | null;
};

export type CostItem = {
  id: string;
  type: string;
  description: string;
  supplier: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  createdAtISO: string;
};
