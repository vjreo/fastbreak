"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createEvent,
  updateEvent,
} from "@/app/dashboard/events/actions";
import type { Event, SportType, VenueCatalog } from "@/types/database";

const CREATE_NEW_VENUE = "__create_new__";
const SELECT_VENUE_PLACEHOLDER = "";

const eventSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  sport_type_id: z.string().min(1, "Please select a sport"),
  date_time: z.string().min(1, "Date and time are required"),
  duration_minutes: z
    .number()
    .int()
    .min(1, "Duration must be at least 1 minute")
    .optional(),
  description: z.string().optional(),
  venues: z.array(
    z.object({
      venue_catalog_id: z.string(),
      name: z.string(),
      address: z.string().optional(),
    }).refine(
      (v) =>
        v.venue_catalog_id !== SELECT_VENUE_PLACEHOLDER && v.venue_catalog_id !== CREATE_NEW_VENUE
          ? true
          : v.name.trim().length > 0,
      {
        message: "Please select a venue or create a new one",
        path: ["name"],
      }
    )
  ),
});

type EventFormValues = z.infer<typeof eventSchema>;

function toLocalDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface EventFormProps {
  sportTypes: SportType[];
  venueCatalog: VenueCatalog[];
  event?: Event | null;
}

export function EventForm({ sportTypes, venueCatalog, event }: EventFormProps) {
  const router = useRouter();
  const isEdit = !!event;

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: event?.name ?? "",
      sport_type_id: event?.sport_type_id ?? "",
      date_time: event ? toLocalDateTime(event.date_time) : "",
      duration_minutes: event?.duration_minutes ?? undefined,
      description: event?.description ?? "",
      venues: (() => {
        const venues = event?.venues?.sort((a, b) => a.sort_order - b.sort_order) ?? [];
        const seen = new Set<string>();
        const deduped = venues.filter((v) => {
          const catalogId = v.venue_catalog_id ?? CREATE_NEW_VENUE;
          const key =
            catalogId !== CREATE_NEW_VENUE && catalogId !== SELECT_VENUE_PLACEHOLDER
              ? `catalog:${catalogId}`
              : `custom:${v.name}|${v.address ?? ""}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return deduped.length > 0
          ? deduped.map((v) => ({
              venue_catalog_id: v.venue_catalog_id ?? CREATE_NEW_VENUE,
              name: v.name,
              address: v.address ?? "",
            }))
          : [{ venue_catalog_id: SELECT_VENUE_PLACEHOLDER, name: "", address: "" }];
      })(),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "venues",
  });

  useEffect(() => {
    if (!event) {
      form.reset({
        name: "",
        sport_type_id: "",
        date_time: "",
        duration_minutes: undefined,
        description: "",
        venues: [{ venue_catalog_id: SELECT_VENUE_PLACEHOLDER, name: "", address: "" }],
      });
    }
  }, [event, form]);

  const onSubmit = async (values: EventFormValues) => {
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("sport_type_id", values.sport_type_id);
    formData.set("date_time", new Date(values.date_time).toISOString());
    if (values.duration_minutes != null) {
      formData.set("duration_minutes", String(values.duration_minutes));
    }
    formData.set("description", values.description ?? "");
    values.venues.forEach((v) => {
      const isNewVenue = v.venue_catalog_id === CREATE_NEW_VENUE || v.venue_catalog_id === SELECT_VENUE_PLACEHOLDER;
      formData.append("venue_catalog_id", isNewVenue ? "" : v.venue_catalog_id);
      formData.append("venue_name", isNewVenue ? v.name : "");
      formData.append("venue_address", isNewVenue ? (v.address ?? "") : "");
    });

    const result = isEdit
      ? await updateEvent(event.id, formData)
      : await createEvent(formData);

    if (result.success) {
      toast.success(isEdit ? "Event updated." : "Event created.");
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Saturday Soccer Tournament" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sport_type_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sport</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sport" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sportTypes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date & time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="duration_minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes, optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 90"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === ""
                        ? undefined
                        : parseInt(e.target.value, 10)
                    )
                  }
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Event details..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Venues</FormLabel>
<Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ venue_catalog_id: SELECT_VENUE_PLACEHOLDER, name: "", address: "" })}
              className="border-primary/40 text-primary hover:bg-primary/10"
              aria-label="Add venue"
            >
              <Plus className="size-4 mr-1" aria-hidden />
              Add venue
            </Button>
          </div>
          {fields.map((field, index) => {
            const venueCatalogId = form.watch(`venues.${index}.venue_catalog_id`);
            const isCreateNew = venueCatalogId === CREATE_NEW_VENUE;
            const isSelectOrCreate = venueCatalogId === SELECT_VENUE_PLACEHOLDER || isCreateNew;
            const showForm = isSelectOrCreate;
            const showDropdown = venueCatalogId !== CREATE_NEW_VENUE;
            return (
              <div key={field.id} className="space-y-2">
                {showDropdown && (
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`venues.${index}.venue_catalog_id`}
                      render={({ field: selectField }) => (
                        <FormItem className="flex-1">
                          <Select
                            value={selectField.value}
                            onValueChange={(val) => {
                              selectField.onChange(val);
                              if (val === CREATE_NEW_VENUE) {
                                form.setValue(`venues.${index}.name`, "");
                                form.setValue(`venues.${index}.address`, "");
                              } else if (val !== SELECT_VENUE_PLACEHOLDER) {
                                const venue = venueCatalog.find((vc) => vc.id === val);
                                if (venue) {
                                  form.setValue(`venues.${index}.name`, venue.name);
                                  form.setValue(`venues.${index}.address`, venue.address ?? "");
                                }
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a venue" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={CREATE_NEW_VENUE}>
                                + Create new venue
                              </SelectItem>
                              {venueCatalog.map((vc) => (
                                <SelectItem key={vc.id} value={vc.id}>
                                  {vc.name}
                                  {vc.address ? ` — ${vc.address}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    {!showForm && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                        aria-label={`Remove venue ${index + 1}`}
                      >
                        <Trash2 className="size-4 text-destructive" aria-hidden />
                      </Button>
                    )}
                  </div>
                )}
                {showForm && (
                  <div className="flex gap-2 rounded-lg border p-4">
                    <div className="flex-1 space-y-2">
                      <FormField
                        control={form.control}
                        name={`venues.${index}.name`}
                        render={({ field: nameField }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Venue name" {...nameField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <label
                          htmlFor={`venue-address-${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Address (optional)
                        </label>
                        <Input
                          id={`venue-address-${index}`}
                          placeholder="e.g. 123 Main St"
                          {...form.register(`venues.${index}.address`)}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                      aria-label={`Remove venue ${index + 1}`}
                    >
                      <Trash2 className="size-4 text-destructive" aria-hidden />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : isEdit ? "Update event" : "Create event"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
