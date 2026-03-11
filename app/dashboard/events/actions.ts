"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createSuccess,
  createError,
  type ActionResult,
} from "@/lib/actions";
import type { Event, SportType, VenueCatalog } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function getVenueCatalog(): Promise<VenueCatalog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venue_catalog")
    .select("id, name, address")
    .order("name");

  if (error) {
    console.error("getVenueCatalog error:", error);
    return [];
  }
  return (data ?? []) as VenueCatalog[];
}

export async function getSportTypes(): Promise<SportType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sport_types")
    .select("id, name")
    .order("name");

  if (error) {
    console.error("getSportTypes error:", error);
    return [];
  }
  return (data ?? []) as SportType[];
}

export async function getEvent(eventId: string): Promise<Event | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data, error } = await supabase
    .from("events")
    .select(
      `
      id,
      name,
      sport_type_id,
      date_time,
      duration_minutes,
      description,
      created_by,
      created_at,
      updated_at,
      sport_types (id, name),
      venues (id, name, address, sort_order, venue_catalog_id)
    `
    )
    .eq("id", eventId)
    .eq("created_by", user.id)
    .single();

  if (error || !data) return null;
  return data as unknown as Event;
}

export async function getEvents(
  search?: string,
  sport?: string,
  date?: string
): Promise<Event[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return [];

  let query = supabase
    .from("events")
    .select(
      `
      id,
      name,
      sport_type_id,
      date_time,
      duration_minutes,
      description,
      created_by,
      created_at,
      updated_at,
      sport_types (id, name),
      venues (id, name, address, sort_order, venue_catalog_id)
    `
    )
    .eq("created_by", user.id)
    .order("date_time", { ascending: true });

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }
  if (sport?.trim()) {
    const sportIds = sport.split(",").map((s) => s.trim()).filter(Boolean);
    query = sportIds.length === 1
      ? query.eq("sport_type_id", sportIds[0])
      : query.in("sport_type_id", sportIds);
  }

  if (date?.trim()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    query = query
      .gte("date_time", start.toISOString())
      .lte("date_time", end.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("getEvents error:", error);
    return [];
  }

  return (data ?? []) as unknown as Event[];
}

export async function createEvent(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return createError("You must be logged in to create an event.");
  }

  const name = formData.get("name") as string;
  const sport_type_id = formData.get("sport_type_id") as string;
  const date_time = formData.get("date_time") as string;
  const description = (formData.get("description") as string) || null;
  const durationRaw = formData.get("duration_minutes") as string | null;
  const duration_minutes = durationRaw ? parseInt(durationRaw, 10) || null : null;

  if (!name?.trim()) return createError("Event name is required.");
  if (!sport_type_id) return createError("Please select a sport.");
  if (!date_time) return createError("Date and time are required.");

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      name: name.trim(),
      sport_type_id,
      date_time: new Date(date_time).toISOString(),
      duration_minutes,
      description: description?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (eventError) {
    console.error("createEvent error:", eventError);
    return createError(eventError.message);
  }

  const venueCatalogIds = formData.getAll("venue_catalog_id") as string[];
  const venueNames = formData.getAll("venue_name") as string[];
  const venueAddresses = formData.getAll("venue_address") as string[];

  if (venueCatalogIds.length > 0 || venueNames.length > 0) {
    const count = Math.max(venueCatalogIds.length, venueNames.length);
    const venuesToInsert: { event_id: string; venue_catalog_id: string | null; name: string; address: string | null; sort_order: number }[] = [];
    const seenCatalogIds = new Set<string>();
    const seenNewVenueKeys = new Set<string>();

    for (let i = 0; i < count; i++) {
      const catalogId = (venueCatalogIds[i] ?? "").trim() || null;
      const name = (venueNames[i] ?? "").trim();
      const address = (venueAddresses[i] ?? "").trim() || null;

      if (catalogId) {
        if (seenCatalogIds.has(catalogId)) continue;
        seenCatalogIds.add(catalogId);
        const { data: catalog } = await supabase
          .from("venue_catalog")
          .select("name, address")
          .eq("id", catalogId)
          .single();
        if (catalog) {
          venuesToInsert.push({
            event_id: event.id,
            venue_catalog_id: catalogId,
            name: catalog.name,
            address: catalog.address,
            sort_order: venuesToInsert.length,
          });
        }
      } else if (name) {
        const key = `new:${name}|${address ?? ""}`;
        if (seenNewVenueKeys.has(key)) continue;
        seenNewVenueKeys.add(key);
        const { data: newCatalog } = await supabase
          .from("venue_catalog")
          .insert({ name, address })
          .select("id, name, address")
          .single();
        if (newCatalog) {
          venuesToInsert.push({
            event_id: event.id,
            venue_catalog_id: newCatalog.id,
            name: newCatalog.name,
            address: newCatalog.address,
            sort_order: venuesToInsert.length,
          });
        }
      }
    }

    if (venuesToInsert.length > 0) {
      const { error: venuesError } = await supabase.from("venues").insert(venuesToInsert);
      if (venuesError) {
        console.error("createEvent venues error:", venuesError);
      }
    }
  }

  revalidatePath("/dashboard");
  return createSuccess({ id: event.id });
}

export async function updateEvent(
  eventId: string,
  formData: FormData
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return createError("You must be logged in to update an event.");
  }

  const name = formData.get("name") as string;
  const sport_type_id = formData.get("sport_type_id") as string;
  const date_time = formData.get("date_time") as string;
  const description = (formData.get("description") as string) || null;
  const durationRaw = formData.get("duration_minutes") as string | null;
  const duration_minutes = durationRaw ? parseInt(durationRaw, 10) || null : null;

  if (!name?.trim()) return createError("Event name is required.");
  if (!sport_type_id) return createError("Please select a sport.");
  if (!date_time) return createError("Date and time are required.");

  const { error: updateError } = await supabase
    .from("events")
    .update({
      name: name.trim(),
      sport_type_id,
      date_time: new Date(date_time).toISOString(),
      duration_minutes,
      description: description?.trim() || null,
    })
    .eq("id", eventId)
    .eq("created_by", user.id);

  if (updateError) {
    console.error("updateEvent error:", updateError);
    return createError(updateError.message);
  }

  await supabase
    .from("venues")
    .update({ deleted_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .is("deleted_at", null);

  const venueCatalogIds = formData.getAll("venue_catalog_id") as string[];
  const venueNames = formData.getAll("venue_name") as string[];
  const venueAddresses = formData.getAll("venue_address") as string[];

  if (venueCatalogIds.length > 0 || venueNames.length > 0) {
    const count = Math.max(venueCatalogIds.length, venueNames.length);
    const venuesToInsert: { event_id: string; venue_catalog_id: string | null; name: string; address: string | null; sort_order: number }[] = [];
    const seenCatalogIds = new Set<string>();
    const seenNewVenueKeys = new Set<string>();

    for (let i = 0; i < count; i++) {
      const catalogId = (venueCatalogIds[i] ?? "").trim() || null;
      const name = (venueNames[i] ?? "").trim();
      const address = (venueAddresses[i] ?? "").trim() || null;

      if (catalogId) {
        if (seenCatalogIds.has(catalogId)) continue;
        seenCatalogIds.add(catalogId);
        const { data: catalog } = await supabase
          .from("venue_catalog")
          .select("name, address")
          .eq("id", catalogId)
          .single();
        if (catalog) {
          venuesToInsert.push({
            event_id: eventId,
            venue_catalog_id: catalogId,
            name: catalog.name,
            address: catalog.address,
            sort_order: venuesToInsert.length,
          });
        }
      } else if (name) {
        const key = `new:${name}|${address ?? ""}`;
        if (seenNewVenueKeys.has(key)) continue;
        seenNewVenueKeys.add(key);
        const { data: newCatalog } = await supabase
          .from("venue_catalog")
          .insert({ name, address })
          .select("id, name, address")
          .single();
        if (newCatalog) {
          venuesToInsert.push({
            event_id: eventId,
            venue_catalog_id: newCatalog.id,
            name: newCatalog.name,
            address: newCatalog.address,
            sort_order: venuesToInsert.length,
          });
        }
      }
    }

    if (venuesToInsert.length > 0) {
      await supabase.from("venues").insert(venuesToInsert);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${eventId}/edit`);
  return createSuccess(undefined);
}

export async function deleteEvent(eventId: string): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return createError("You must be logged in to delete an event.");
  }

  const { error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("created_by", user.id);

  if (error) {
    console.error("deleteEvent error:", error);
    return createError(error.message);
  }

  revalidatePath("/dashboard");
  return createSuccess(undefined);
}
