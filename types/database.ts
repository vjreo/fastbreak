/**
 * Types for Forecheck database entities.
 */
export interface SportType {
  id: string;
  name: string;
  deleted_at?: string | null;
}

export interface Event {
  id: string;
  name: string;
  sport_type_id: string;
  date_time: string;
  duration_minutes?: number | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  sport_types?: SportType | SportType[] | null;
  venues?: Venue[];
}

export interface Venue {
  id: string;
  event_id: string;
  name: string;
  address: string | null;
  sort_order: number;
  venue_catalog_id?: string | null;
  deleted_at?: string | null;
}

export interface VenueCatalog {
  id: string;
  name: string;
  address: string | null;
  deleted_at?: string | null;
}
