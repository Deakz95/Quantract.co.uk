"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { FormField, FormInput, FormTextarea, LoadingSpinner } from "@/components/ui/FormField";
import { useFormValidation, type ValidationSchema } from "@/hooks/useFormValidation";
import { apiRequest, getApiErrorMessage, requireOk } from "@/lib/apiClient";
import { ActivityTypeIcon, type ActivityType, getActivityTypeLabel } from "./ActivityTypeIcon";
import type { Activity } from "./ActivityItem";

const ACTIVITY_TYPES: ActivityType[] = ["NOTE", "CALL", "EMAIL", "MEETING", "TASK"];

type ActivityFormProps = {
  entityType: "contact" | "deal" | "client" | "job";
  entityId: string;
  activity?: Activity | null;
  onSuccess?: (activity: Activity) => void;
  onCancel?: () => void;
};

// Validation schema for activity form
const validationSchema: ValidationSchema = {
  subject: { required: "Subject is required" },
};

export function ActivityForm({ entityType, entityId, activity, onSuccess, onCancel }: ActivityFormProps) {
  const { toast } = useToast();

  const [type, setType] = useState<ActivityType>(activity?.type || "NOTE");
  const [subject, setSubject] = useState(activity?.subject || "");
  const [description, setDescription] = useState(activity?.description || "");
  const [occurredAt, setOccurredAt] = useState(() => {
    if (activity?.occurredAt) {
      return new Date(activity.occurredAt).toISOString().slice(0, 16);
    }
    return new Date().toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(activity);

  const { errors, touched, validateField, validateAll, setFieldTouched, clearErrors } = useFormValidation<{ subject: string }>(validationSchema);

  const handleBlur = useCallback(
    (field: "subject") => {
      setFieldTouched(field);
      validateField(field, subject);
    },
    [subject, setFieldTouched, validateField]
  );

  // Check if form is valid for submission
  const canSubmit = useMemo(() => {
    return Boolean(subject.trim());
  }, [subject]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const formIsValid = validateAll({ subject });
      if (!formIsValid) {
        toast({ title: "Please fix the errors before saving", variant: "destructive" });
        return;
      }

      setSaving(true);
      try {
        const payload: Record<string, unknown> = {
          type,
          subject: subject.trim(),
          description: description.trim() || null,
          occurredAt: new Date(occurredAt).toISOString(),
        };

        // Add entity reference based on type
        switch (entityType) {
          case "contact":
            payload.contactId = entityId;
            break;
          case "deal":
            payload.dealId = entityId;
            break;
          case "client":
            payload.clientId = entityId;
            break;
          case "job":
            payload.jobId = entityId;
            break;
        }

        let result: Activity;

        if (isEditing && activity) {
          const data = await apiRequest<{ ok: boolean; activity: Activity; error?: string }>(
            `/api/admin/activities/${activity.id}`,
            {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            }
          );
          requireOk(data, "Failed to update activity");
          result = data.activity;
          toast({ title: "Activity updated", variant: "success" });
        } else {
          const data = await apiRequest<{ ok: boolean; activity: Activity; error?: string }>(
            "/api/admin/activities",
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            }
          );
          requireOk(data, "Failed to create activity");
          result = data.activity;
          toast({ title: "Activity created", variant: "success" });
        }

        // Reset form if not editing
        if (!isEditing) {
          setSubject("");
          setDescription("");
          setOccurredAt(new Date().toISOString().slice(0, 16));
          clearErrors();
        }

        onSuccess?.(result);
      } catch (err) {
        const message = getApiErrorMessage(err, isEditing ? "Failed to update activity" : "Failed to create activity");
        toast({ title: message, variant: "destructive" });
      } finally {
        setSaving(false);
      }
    },
    [type, subject, description, occurredAt, entityType, entityId, activity, isEditing, toast, onSuccess, validateAll, clearErrors]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Activity Type Selector */}
      <div>
        <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-2">
          Activity Type
        </label>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                type === t
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
              }`}
            >
              <ActivityTypeIcon type={t} size="sm" />
              <span className="text-sm">{getActivityTypeLabel(t)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <FormField
        label="Subject"
        required
        error={errors.subject}
        touched={touched.subject}
        htmlFor="activity-subject"
      >
        <FormInput
          id="activity-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onBlur={() => handleBlur("subject")}
          placeholder={`Enter ${getActivityTypeLabel(type).toLowerCase()} subject...`}
          hasError={Boolean(errors.subject && touched.subject)}
          className="w-full"
        />
      </FormField>

      {/* Description */}
      <FormField label="Description" htmlFor="activity-description">
        <FormTextarea
          id="activity-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details..."
          rows={3}
          className="w-full resize-none"
        />
      </FormField>

      {/* Date/Time */}
      <FormField label="Date & Time" htmlFor="activity-occurredAt">
        <FormInput
          id="activity-occurredAt"
          type="datetime-local"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          className="w-full"
        />
      </FormField>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving || !canSubmit}>
          {saving ? (
            <>
              <LoadingSpinner className="mr-2" />
              Saving...
            </>
          ) : isEditing ? (
            "Update Activity"
          ) : (
            "Add Activity"
          )}
        </Button>
      </div>
    </form>
  );
}
