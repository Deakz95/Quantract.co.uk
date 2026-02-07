"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Input,
  Label,
  NativeSelect,
  Textarea,
} from "@quantract/ui";
import type { z } from "zod";
import type { contractorDetailsSchema } from "@quantract/shared/certificate-types";

type ContractorDetailsData = z.infer<typeof contractorDetailsSchema>;

interface ContractorDetailsProps {
  data: ContractorDetailsData;
  onChange: (data: ContractorDetailsData) => void;
}

export function ContractorDetails({ data, onChange }: ContractorDetailsProps) {
  const update = (field: keyof ContractorDetailsData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contractor Details</CardTitle>
        <CardDescription>
          Details of the contractor carrying out the work
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company Name - full width */}
        <div>
          <Label htmlFor="contractor-companyName">Company Name</Label>
          <Input
            id="contractor-companyName"
            value={data.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            placeholder="Trading or registered company name"
          />
        </div>

        {/* Address - full width, textarea */}
        <div>
          <Label htmlFor="contractor-address">Address</Label>
          <Textarea
            id="contractor-address"
            value={data.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="Full registered or trading address"
            className="min-h-[80px]"
          />
        </div>

        {/* Phone + Email - 2 column grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contractor-phone">Phone</Label>
            <Input
              id="contractor-phone"
              type="tel"
              value={data.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="e.g. 0123 456 7890"
            />
          </div>
          <div>
            <Label htmlFor="contractor-email">Email</Label>
            <Input
              id="contractor-email"
              type="email"
              value={data.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="e.g. office@example.com"
            />
          </div>
        </div>

        {/* Scheme Name + Scheme Number - 2 column grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contractor-schemeName">Scheme Name</Label>
            <NativeSelect
              id="contractor-schemeName"
              value={data.schemeName}
              onChange={(e) => update("schemeName", e.target.value)}
            >
              <option value="">Select...</option>
              <option value="NICEIC">NICEIC</option>
              <option value="NAPIT">NAPIT</option>
              <option value="ELECSA">ELECSA</option>
              <option value="STROMA">STROMA</option>
              <option value="BRE">BRE</option>
              <option value="Other">Other</option>
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="contractor-schemeNumber">Scheme Number</Label>
            <Input
              id="contractor-schemeNumber"
              value={data.schemeNumber}
              onChange={(e) => update("schemeNumber", e.target.value)}
              placeholder="Membership / scheme number"
            />
          </div>
        </div>

        {/* Registration Number - full width */}
        <div>
          <Label htmlFor="contractor-registrationNumber">
            Registration Number
          </Label>
          <Input
            id="contractor-registrationNumber"
            value={data.registrationNumber}
            onChange={(e) => update("registrationNumber", e.target.value)}
            placeholder="Company or contractor registration number"
          />
        </div>
      </CardContent>
    </Card>
  );
}
